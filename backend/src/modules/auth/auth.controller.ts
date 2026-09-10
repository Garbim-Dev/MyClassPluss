import { Controller, Post, Get, Body, Req, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  login(@Body() body: any) {
    return this.authService.login(body);
  }

  // Cadastro de novo professor/instrutor
  @Post('register-teacher')
  registerTeacher(@Body() body: { name: string; email: string; password: string }) {
    return this.authService.registerTeacher(body);
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPass: string }) {
    return this.authService.resetPassword(body.token, body.newPass);
  }

  // Entrada e confirmação de presença do aluno via celular/QR Code
  @Post('student-join')
  studentJoin(@Body() body: { name: string; email: string; password?: string; classId: string }) {
    return this.authService.studentJoin(body);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getMe(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;

    if (!userId) {
      throw new NotFoundException('Identificador de usuário não encontrado.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return user;
  }
}