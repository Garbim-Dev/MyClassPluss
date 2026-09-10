import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async registerTeacher(body: { name: string; email: string; password: string }) {
    const { name, email, password } = body;

    if (!name || !email || !password) {
      throw new BadRequestException('Nome, e-mail e senha são obrigatórios.');
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      throw new ConflictException('Já existe um usuário cadastrado com este e-mail.');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        passwordHash,
        role: 'PROFESSOR',
      },
    });

    const payload = { sub: user.id, id: user.id, email: user.email, name: user.name, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(body: any) {
    const email = (body.email || body.username || '').toLowerCase().trim();
    const password = body.password;

    if (!email || !password) {
      throw new BadRequestException('E-mail e senha são obrigatórios.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('E-mail não cadastrado. Clique na aba "Criar Conta" para se registrar.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Senha incorreta.');
    }

    const payload = { sub: user.id, id: user.id, email: user.email, name: user.name, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  // ⚡ Rotina de Solicitação de Recuperação de Senha (Gera Token e Link)
  async forgotPassword(email: string) {
    const cleanEmail = email.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: cleanEmail, mode: 'insensitive' },
      },
    });

    if (!user) {
      // Por segurança, retornamos mensagem genérica para não expor e-mails cadastrados
      return { message: 'Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.' };
    }

    // 1. Gera um token criptográfico seguro e validade de 1 hora
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpire = new Date(Date.now() + 3600000); // 1 hora no futuro

    await this.prisma.user.update({
      where: { id: user.id },
      data: { 
        resetPasswordToken: resetToken,
        resetPasswordExpire: resetExpire,
      },
    });

    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;

    // 2. Configuração do Transporter do Nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || process.env.MAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || process.env.MAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || process.env.MAIL_USER || '',
        pass: process.env.SMTP_PASS || process.env.MAIL_PASS || '',
      },
    });

    const mailOptions = {
      from: `"MyClassPluss Suporte" <${process.env.SMTP_USER || process.env.MAIL_USER || 'nao-responda@myclasspluss.com'}>`,
      to: cleanEmail,
      subject: '🔐 Redefinição de Senha - MyClassPluss',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #070b19; color: #ffffff; padding: 30px; border-radius: 16px; max-width: 500px; margin: auto;">
          <h2 style="color: #3b82f6; text-align: center; margin-bottom: 8px;">MyClassPluss</h2>
          <p style="text-align: center; color: #94a3b8; font-size: 13px; margin-top: 0;">Gestão Acadêmica & Plataforma de Aulas</p>
          
          <div style="background-color: #0f172a; border: 1px solid #1e293b; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
            <p style="color: #e2e8f0; font-size: 14px; margin: 0 0 10px 0;">Olá, <strong>${user.name}</strong>!</p>
            <p style="color: #94a3b8; font-size: 12px; margin: 0 0 20px 0;">Você solicitou a redefinição da sua senha. Clique no botão abaixo para criar uma nova credencial de acesso:</p>
            
            <a href="${resetLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; margin-bottom: 10px;">
              Redefinir Minha Senha
            </a>
          </div>

          <p style="color: #64748b; font-size: 11px; text-align: center;">
            Este link é válido por apenas 1 hora. Se você não solicitou esta alteração, ignore este e-mail.
          </p>
        </div>
      `,
    };

    // Tenta enviar o e-mail real ou cai no fallback de console (Mock)
    try {
      const smtpUser = process.env.SMTP_USER || process.env.MAIL_USER;
      const smtpPass = process.env.SMTP_PASS || process.env.MAIL_PASS;

      if (smtpUser && smtpPass) {
        await transporter.sendMail(mailOptions);
        console.log(`[MyClassPluss Auth] E-mail de recuperação enviado com sucesso para: ${cleanEmail}`);
      } else {
        console.log(`\n======================================================`);
        console.log(`[MyClassPluss MOCK E-MAIL] SMTP não configurado no .env`);
        console.log(`Destinatário: ${cleanEmail} (${user.name})`);
        console.log(`Link de Redefinição: ${resetLink}`);
        console.log(`======================================================\n`);
      }
    } catch (mailError) {
      console.warn('[MyClassPluss Auth] Aviso ao disparar e-mail:', mailError);
      console.log(`[Fallback Console] Link para ${cleanEmail}: ${resetLink}`);
    }

    return {
      message: 'Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.',
    };
  }

  // ⚡ Rotina de Confirmação e Gravação da Nova Senha via Token
  async resetPassword(token: string, newPass: string) {
    if (!token || !newPass) {
      throw new BadRequestException('Token e nova senha são obrigatórios.');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpire: { gte: new Date() }, // Verifica se o token não expirou
      },
    });

    if (!user) {
      throw new BadRequestException('Token inválido ou expirado.');
    }

    const passwordHash = await bcrypt.hash(newPass, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpire: null,
      },
    });

    return { message: 'Senha redefinida com sucesso! Faça login com a nova senha.' };
  }

  async studentJoin(data: { name: string; email: string; password?: string; classId: string }) {
    const { name, email, password, classId } = data;

    if (!name || !email || !classId) {
      throw new BadRequestException('Nome, e-mail/matrícula e ID da turma são obrigatórios.');
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();
    const pass = password || '123456';
    const passwordHash = await bcrypt.hash(pass, 10);

    let user = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          name: cleanName,
          email: cleanEmail,
          passwordHash,
          role: 'ALUNO',
        },
      });
    } else {
      if (cleanName && user.name !== cleanName) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { name: cleanName },
        });
      }
    }

    const classExists = await this.prisma.class.findUnique({
      where: { id: classId },
    });

    if (classExists) {
      const existingEnrollment = await this.prisma.enrollment.findUnique({
        where: {
          userId_classId: {
            userId: user.id,
            classId,
          },
        },
      });

      if (!existingEnrollment) {
        await this.prisma.enrollment.create({
          data: {
            userId: user.id,
            classId,
          },
        });
      }
    }

    const payload = { sub: user.id, id: user.id, email: user.email, name: user.name, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}