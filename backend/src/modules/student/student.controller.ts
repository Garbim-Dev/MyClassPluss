import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { StudentService } from './student.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get('my-classes')
  @UseGuards(JwtAuthGuard)
  getMyClasses(@Req() req: any) {
    return this.studentService.getMyClasses(req.user.id);
  }

  @Get('my-grades')
  @UseGuards(JwtAuthGuard)
  getMyGrades(@Req() req: any, @Query('classId') classId?: string) {
    return this.studentService.getMyGrades(req.user.id, classId);
  }
}