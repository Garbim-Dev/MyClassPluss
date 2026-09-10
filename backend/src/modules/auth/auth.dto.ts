import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterTeacherDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  name!: string;

  @IsEmail({}, { message: 'Informe um e-mail válido' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
  password!: string;
}

export class StudentJoinDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'O e-mail ou matrícula é obrigatório' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'A senha ou PIN é obrigatório' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'O identificador da turma é obrigatório' })
  classId!: string;
}

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe o e-mail ou matrícula' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe a senha' })
  password!: string;
}