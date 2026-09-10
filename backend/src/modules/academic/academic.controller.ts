import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AcademicService } from './academic.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('academic')
@UseGuards(AuthGuard('jwt'))
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  // ⚡ Rotas de Gestão de Instituições
  @Get('institutions')
  listInstitutions(@Req() req: any) {
    const teacherId = req.user?.id || req.user?.userId;
    return this.academicService.listInstitutions(teacherId);
  }

  @Post('institutions')
  createInstitution(@Body() data: any, @Req() req: any) {
    const teacherId = req.user?.id || req.user?.userId;
    return this.academicService.createInstitution(data, teacherId);
  }

  @Put('institutions/:id')
  updateInstitution(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    const teacherId = req.user?.id || req.user?.userId;
    return this.academicService.updateInstitution(id, data, teacherId);
  }

  @Delete('institutions/:id')
  deleteInstitution(@Param('id') id: string) {
    return this.academicService.deleteInstitution(id);
  }

  @Get('institutions/:institutionId/courses')
  async listCourses(@Param('institutionId') institutionId: string) {
    return this.academicService.listCoursesByInstitution(institutionId);
  }

  @Post('courses')
  async createCourse(@Body() body: { name: string; workload: number; institutionId: string }) {
    return this.academicService.createCourse(body);
  }

  @Put('courses/:id')
  async updateCourse(@Param('id') id: string, @Body() body: { name: string; workload: number }) {
    return this.academicService.updateCourse(id, body);
  }

  @Delete('courses/:id')
  async deleteCourse(@Param('id') id: string) {
    return this.academicService.deleteCourse(id);
  }

  @Get('rooms')
  @UseGuards(AuthGuard('jwt'))
  async listRooms() {
    return this.academicService.listRooms();
  }

  @Post('rooms')
  @UseGuards(AuthGuard('jwt'))
  async createRoom(@Body() body: { name: string; capacity?: number; description?: string }) {
    return this.academicService.createRoom(body);
  }

  @Put('rooms/:id')
  @UseGuards(AuthGuard('jwt'))
  async updateRoom(@Param('id') id: string, @Body() body: any) {
    return this.academicService.updateRoom(id, body);
  }

  @Delete('rooms/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteRoom(@Param('id') id: string) {
    return this.academicService.deleteRoom(id);
  }

  @Post('classes')
  @UseGuards(AuthGuard('jwt'))
  async createClass(@Body() body: any, @Req() req: any) {
    const teacherId = req.user?.userId || req.user?.id;
    // Se o frontend envia como dados de turma simples, redireciona para createDemand
    return this.academicService.createDemand(body, teacherId);
  }

  @Get('classes')
  @UseGuards(AuthGuard('jwt'))
  async findAllClasses(@Req() req: any) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.academicService.listClasses(teacherId);
  }

  @Delete('classes/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteClass(@Param('id') id: string) {
    return this.academicService.deleteDemand(id);
  }  

  @Get('classes/:classId/students')
  @UseGuards(AuthGuard('jwt'))
  async listClassStudents(@Param('classId') classId: string) {
    return this.academicService.listClassStudents(classId);
  }

  @Post('classes/:classId/students')
  @UseGuards(AuthGuard('jwt'))
  async enrollStudentManual(
    @Param('classId') classId: string,
    @Body() body: { name: string; email: string }
  ) {
    return this.academicService.enrollStudentManual(classId, body);
  }

  @Post('join-by-code')
  async joinClassByCode(@Body() body: { classCode: string; name: string; email: string }) {
    return this.academicService.joinClassByCode(body.classCode, body.name, body.email);
  }

  @Put('students/:id')
  @UseGuards(AuthGuard('jwt'))
  async updateStudent(@Param('id') id: string, @Body() body: { name: string; email: string }) {
    return this.academicService.updateStudent(id, body);
  }

  @Delete('enrollments/:enrollmentId')
  @UseGuards(AuthGuard('jwt'))
  async removeStudentEnrollment(@Param('enrollmentId') enrollmentId: string) {
    return this.academicService.removeStudentEnrollment(enrollmentId);
  }

  // ⚡ Atualizar Demanda / Turma
  @Post('demands')
  @UseGuards(AuthGuard('jwt'))
  async createDemand(@Body() body: any, @Req() req: any) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.academicService.createDemand(body, teacherId);
  }

  // Se o seu frontend também disparar para a rota no singular ('demand'), adicione um alias:
  @Post('demand')
  @UseGuards(AuthGuard('jwt'))
  async createDemandAlias(@Body() body: any, @Req() req: any) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.academicService.createDemand(body, teacherId);
  }

  @Put('demand/:id') // Aceita tanto /demand/:id quanto /demands/:id se preferir duplicar o decorator
  @UseGuards(AuthGuard('jwt'))
  async updateDemand(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.academicService.updateDemand(id, body, teacherId);
  }

  @Put('demands/:id')
  @UseGuards(AuthGuard('jwt'))
  async updateDemandsAlias(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.academicService.updateDemand(id, body, teacherId);
  }

  // ⚡ Excluir Demanda / Turma
  @Delete('demand/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteDemand(@Param('id') id: string) {
    return this.academicService.deleteDemand(id);
  }

  @Delete('demands/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteDemandsAlias(@Param('id') id: string) {
    return this.academicService.deleteDemand(id);
  }

  @Get('classes')
  listClasses(@Req() req: any) {
    const teacherId = req.user?.id || req.user?.userId;
    return this.academicService.listClasses(teacherId);
  }

  @Get('subjects')
  async listSubjects() {
    return this.academicService.listSubjects();
  }

  @Post('subjects')
  async createSubject(@Body() body: { name: string; workload: number }) {
    return this.academicService.createSubject(body);
  }

  @Put('subjects/:id')
  async updateSubject(@Param('id') id: string, @Body() body: { name: string; workload: number }) {
    return this.academicService.updateSubject(id, body);
  }

  @Delete('subjects/:id')
  async deleteSubject(@Param('id') id: string) {
    return this.academicService.deleteSubject(id);
  }

  @Get('classes/:id/performance')
  async getClassPerformance(@Param('id') id: string) {
    return this.academicService.getClassPerformance(id);
  }

  @Get('classes/:id/qrcode')
  generateQrCode(@Param('id') id: string, @Query('serverIp') serverIp: string) {
    return this.academicService.generateQrCode(id, serverIp);
  }

  // ⚡ Rota para submissão e correção da Avaliação Formal
  @Post('evaluations/submit-exam')
  submitFormalExam(@Body() body: any) {
    return this.academicService.submitFormalExam(body);
  }

  @Get('evaluations/:quizId/class/:classId/dossier')
  getExamDossier(
    @Param('quizId') quizId: string,
    @Param('classId') classId: string,
  ) {
    return this.academicService.getExamDossier(quizId, classId);
  }

  // ⚡ Rota para buscar notas do aluno no Boletim Oficial
  @Get('student-grades/:userId')
  getStudentGrades(@Param('userId') userId: string) {
    return this.academicService.getStudentGrades(userId);
  }

  @Post('classes/:classId/attendance')
  @UseGuards(AuthGuard('jwt'))
  async saveAttendance(
    @Param('classId') classId: string,
    @Body() body: { date: string; records: { userId: string; status: 'PRESENTE' | 'FALTA' | 'JUSTIFICADO' }[] }
  ) {
    return this.academicService.saveAttendance(classId, body.date, body.records);
  }

  @Get('classes/:classId/attendance')
  @UseGuards(AuthGuard('jwt'))
  async getClassAttendanceByDate(
    @Param('classId') classId: string,
    @Query('date') date: string
  ) {
    return this.academicService.getClassAttendanceByDate(classId, date);
  }

 // ⚡ Rotas para o Histórico de Sessões (suporta plural e singular)
  @Get('sessions/history')
  @UseGuards(AuthGuard('jwt'))
  async getSessionsHistoryPlural() {
    return this.academicService.getSessionHistory();
  }

  @Get('session-history')
  @UseGuards(AuthGuard('jwt'))
  async getSessionHistorySingular() {
    return this.academicService.getSessionHistory();
  }

  @Delete('sessions/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteQuizSession(@Param('id') id: string) {
    return this.academicService.deleteQuizSession(id);
  }
}