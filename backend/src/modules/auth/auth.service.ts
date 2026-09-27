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

    // ⚡ Verificação insensível a maiúsculas/minúsculas para blindar contra duplicidade
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: { equals: cleanEmail, mode: 'insensitive' },
      },
    });

    if (existingUser) {
      throw new ConflictException('Já existe um usuário cadastrado com este e-mail. Utilize a tela de Login.');
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
    const rawEmail = (body.email || body.username || '').toString().trim();
    const cleanEmail = rawEmail.toLowerCase();
    const password = body.password;

    if (!cleanEmail || !password) {
      throw new BadRequestException('E-mail e senha são obrigatórios.');
    }

    // ⚡ Busca os usuários correspondentes a esse e-mail
    const matchingUsers = await this.prisma.user.findMany({
      where: {
        email: { equals: cleanEmail, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'asc' }, // Prioriza a conta original mais antiga
    });

    if (!matchingUsers || matchingUsers.length === 0) {
      throw new UnauthorizedException('E-mail não cadastrado. Clique na aba "Criar Conta" para se registrar.');
    }

    // ⚡ Se houver contas duplicadas, localiza qual delas possui turmas ou instituições vinculadas
    let user = matchingUsers[0];

    if (matchingUsers.length > 1) {
      for (const candidate of matchingUsers) {
        const [hasInstitutions, hasClasses, hasQuizzes] = await Promise.all([
          this.prisma.institution.findFirst({ where: { teacherId: candidate.id }, select: { id: true } }),
          this.prisma.class.findFirst({ where: { teacherId: candidate.id }, select: { id: true } }),
          this.prisma.quiz.findFirst({ where: { teacherId: candidate.id }, select: { id: true } }),
        ]);

        if (hasInstitutions || hasClasses || hasQuizzes) {
          user = candidate;
          break;
        }
      }
    }

    // Validação da senha com bcrypt
    let isMatch = await bcrypt.compare(password, user.passwordHash);

    // Fallback caso a nova senha tenha sido gravada em outra das contas duplicadas
    if (!isMatch && matchingUsers.length > 1) {
      for (const altUser of matchingUsers) {
        if (altUser.id !== user.id) {
          const altMatch = await bcrypt.compare(password, altUser.passwordHash);
          if (altMatch) {
            // Sincroniza o hash na conta principal com os dados
            await this.prisma.user.update({
              where: { id: user.id },
              data: { passwordHash: altUser.passwordHash },
            });
            isMatch = true;
            break;
          }
        }
      }
    }

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
        resetPasswordExpire: { gte: new Date() },
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

  async studentJoin(data: {
    name?: string;
    email: string;
    password?: string;
    classId: string;
    isNewStudent?: boolean;
  }) {
    const { name, email, password, classId, isNewStudent } = data;

    if (!email || !classId) {
      throw new BadRequestException('Matrícula/CPF e identificador da turma são obrigatórios.');
    }

    // ⚡ Higienização rigorosa da Matrícula/CPF ou E-mail
    const rawDoc = email.trim().replace(/[.\-\/\s]/g, '');
    const cleanKey = email.includes('@') ? email.toLowerCase().trim() : rawDoc.toLowerCase();
    const userEmailKey = cleanKey.includes('@') ? cleanKey : `${cleanKey}@aluno.myclasspluss.local`;

    const pass = password || '123456';

    // 1. Busca se o usuário já existe
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: userEmailKey, mode: 'insensitive' } },
          { email: { equals: cleanKey, mode: 'insensitive' } },
        ],
      },
    });

    if (isNewStudent) {
      // CADASTRO DE NOVO ALUNO
      if (!name || !name.trim()) {
        throw new BadRequestException('Nome completo é obrigatório para o primeiro cadastro.');
      }
      if (user) {
        throw new ConflictException(
          'Esta Matrícula/CPF já possui cadastro no sistema. Utilize a aba "Já sou Cadastrado".'
        );
      }

      const passwordHash = await bcrypt.hash(pass, 10);
      user = await this.prisma.user.create({
        data: {
          name: name.trim(),
          email: userEmailKey,
          passwordHash,
          role: 'ALUNO',
        },
      });
    } else {
      // LOGIN DE ALUNO JÁ CADASTRADO
      if (!user) {
        throw new UnauthorizedException(
          'Matrícula/CPF não encontrado. Se este for o seu primeiro acesso, clique na aba "Primeiro Acesso".'
        );
      }

      // Validação de senha
      const isMatch = await bcrypt.compare(pass, user.passwordHash);
      if (!isMatch) {
        throw new UnauthorizedException('Senha incorreta.');
      }

      // Atualiza o nome caso tenha sido informado com formato mais completo
      if (name && name.trim().length > user.name.length) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { name: name.trim() },
        });
      }
    }

    // 2. Garante o vínculo único na turma
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
        email: cleanKey,
        role: user.role,
      },
    };
  }
}