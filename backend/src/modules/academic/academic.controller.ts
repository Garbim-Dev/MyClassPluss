import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, Res } from '@nestjs/common';
import { AcademicService } from './academic.service';
import { AuthGuard } from '@nestjs/passport';
import { NetworkService } from './network.service';
import * as express from 'express'; // ⚡ Elimina o erro TS1272 no decorador @Res()
import { BackupService } from './backup.service';

@Controller('academic')
export class AcademicController {
  constructor(
    private readonly academicService: AcademicService,
    private readonly networkService: NetworkService,
    private readonly backupService: BackupService,
  ) {}

  @Get('backup/export')
  @UseGuards(AuthGuard('jwt'))
  async exportBackup(@Res() res: express.Response) {
    const backupData = await this.backupService.exportFullBackup();
    const fileName = `MyClassPluss_Backup_${new Date().toISOString().split('T')[0]}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    return res.send(JSON.stringify(backupData, null, 2));
  }

  @Post('backup/restore')
  @UseGuards(AuthGuard('jwt'))
  async restoreBackup(@Body() body: any) {
    return this.backupService.restoreBackup(body);
  }

  @Get('network/interfaces')
  @UseGuards(AuthGuard('jwt'))
  getNetworkInterfaces() {
    const interfaces = this.networkService.getActiveInterfaces();
    return {
      interfaces,
      count: interfaces.length,
    };
  }

  // ⚡ Gestão de Instituições
  @Get('institutions')
  @UseGuards(AuthGuard('jwt'))
  listInstitutions(@Req() req: any) {
    const teacherId = req.user?.id || req.user?.userId;
    return this.academicService.listInstitutions(teacherId);
  }

  @Post('institutions')
  @UseGuards(AuthGuard('jwt'))
  createInstitution(@Body() data: any, @Req() req: any) {
    const teacherId = req.user?.id || req.user?.userId;
    return this.academicService.createInstitution(data, teacherId);
  }

  @Put('institutions/:id')
  @UseGuards(AuthGuard('jwt'))
  updateInstitution(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    const teacherId = req.user?.id || req.user?.userId;
    return this.academicService.updateInstitution(id, data, teacherId);
  }

  @Delete('institutions/:id')
  @UseGuards(AuthGuard('jwt'))
  deleteInstitution(@Param('id') id: string) {
    return this.academicService.deleteInstitution(id);
  }

  @Get('institutions/:institutionId/courses')
  @UseGuards(AuthGuard('jwt'))
  async listCourses(@Param('institutionId') institutionId: string) {
    return this.academicService.listCoursesByInstitution(institutionId);
  }

  @Post('courses')
  @UseGuards(AuthGuard('jwt'))
  async createCourse(@Body() body: { name: string; workload: number; institutionId: string }) {
    return this.academicService.createCourse(body);
  }

  @Put('courses/:id')
  @UseGuards(AuthGuard('jwt'))
  async updateCourse(@Param('id') id: string, @Body() body: { name: string; workload: number }) {
    return this.academicService.updateCourse(id, body);
  }

  @Delete('courses/:id')
  @UseGuards(AuthGuard('jwt'))
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

  // ⚡ Acesso do Aluno (Entrada por Código sem exigência de JWT de instrutor)
  @Post('join-by-code')
  async joinClassByCode(@Body() body: { classCode: string; name: string; email: string }) {
    return this.academicService.joinClassByCode(body.classCode, body.name, body.email);
  }

  @Put('students/:id')
  @UseGuards(AuthGuard('jwt'))
  async updateStudent(@Param('id') id: string, @Body() body: { name: string; email: string }) {
    return this.academicService.updateStudent(id, body);
  }

  @Get('student/portal-summary')
  @UseGuards(AuthGuard('jwt'))
  async getStudentPortalSummary(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    return this.academicService.getStudentPortalSummary(userId);
  }

  @Delete('enrollments/:enrollmentId')
  @UseGuards(AuthGuard('jwt'))
  async removeStudentEnrollment(@Param('enrollmentId') enrollmentId: string) {
    return this.academicService.removeStudentEnrollment(enrollmentId);
  }

  @Post('demands')
  @UseGuards(AuthGuard('jwt'))
  async createDemand(@Body() body: any, @Req() req: any) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.academicService.createDemand(body, teacherId);
  }

  @Post('demand')
  @UseGuards(AuthGuard('jwt'))
  async createDemandAlias(@Body() body: any, @Req() req: any) {
    const teacherId = req.user?.userId || req.user?.id;
    return this.academicService.createDemand(body, teacherId);
  }

  @Put('demand/:id')
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

  @Get('subjects')
  @UseGuards(AuthGuard('jwt'))
  async listSubjects() {
    return this.academicService.listSubjects();
  }

  @Post('subjects')
  @UseGuards(AuthGuard('jwt'))
  async createSubject(@Body() body: { name: string; workload: number }) {
    return this.academicService.createSubject(body);
  }

  @Put('subjects/:id')
  @UseGuards(AuthGuard('jwt'))
  async updateSubject(@Param('id') id: string, @Body() body: { name: string; workload: number }) {
    return this.academicService.updateSubject(id, body);
  }

  @Delete('subjects/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteSubject(@Param('id') id: string) {
    return this.academicService.deleteSubject(id);
  }

  @Get('classes/:id/performance')
  async getClassPerformance(
    @Param('id') classId: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.academicService.getClassPerformance(classId, subjectId);
  }

  @Get('classes/:id/qrcode')
  generateQrCode(@Param('id') id: string, @Query('serverIp') serverIp: string) {
    return this.academicService.generateQrCode(id, serverIp);
  }

  @Post('evaluations/submit-exam')
  submitFormalExam(@Body() body: any) {
    return this.academicService.submitFormalExam(body);
  }

  @Get('evaluations/:quizId/class/:classId/dossier')
  @UseGuards(AuthGuard('jwt'))
  getExamDossier(
    @Param('quizId') quizId: string,
    @Param('classId') classId: string,
  ) {
    return this.academicService.getExamDossier(quizId, classId);
  }

  // ⚡ Consulta de notas acessível pelo Portal do Aluno
  @Get('student-grades/:userId')
  getStudentGrades(@Param('userId') userId: string) {
    return this.academicService.getStudentGrades(userId);
  }

  // ⚡ Resumo completo do portal do aluno
  @Get('student/:userId/summary')
  getStudentPortalSummaryParam(@Param('userId') userId: string) {
    return this.academicService.getStudentPortalSummary(userId);
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

  @Get('classes/:id/attendance-report')
  async getConsolidatedAttendanceReport(@Param('id') id: string) {
    return this.academicService.getConsolidatedAttendanceReport(id);
  }

  @Get('personal-questions')
  @UseGuards(AuthGuard('jwt'))
  async listPersonalQuestions(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('tag') tag?: string,
    @Query('favorites') favorites?: string,
  ) {
    const teacherId = req.user?.id || req.user?.userId;
    return this.academicService.listPersonalQuestions(
      teacherId,
      search,
      tag,
      favorites === 'true',
    );
  }

  @Post('personal-questions')
  @UseGuards(AuthGuard('jwt'))
  async createPersonalQuestion(@Req() req: any, @Body() data: any) {
    const teacherId = req.user?.id || req.user?.userId;
    return this.academicService.createPersonalQuestion(teacherId, data);
  }

  @Put('personal-questions/:id/favorite')
  @UseGuards(AuthGuard('jwt'))
  async toggleFavorite(@Req() req: any, @Param('id') id: string) {
    const teacherId = req.user?.id || req.user?.userId;
    return this.academicService.toggleFavoriteQuestion(id, teacherId);
  }

  @Delete('personal-questions/:id')
  @UseGuards(AuthGuard('jwt'))
  async deletePersonalQuestion(@Req() req: any, @Param('id') id: string) {
    const teacherId = req.user?.id || req.user?.userId;
    return this.academicService.deletePersonalQuestion(id, teacherId);
  }

  // =========================================================================
  // ⚡ ROTAS DE AULAS / SLIDES / MATERIAIS DE ESTUDO (RESOLVE O 404 DO CONTENTMANAGER)
  // =========================================================================
  @Get('subjects/:subjectId/lessons')
  async listLessonsBySubject(@Param('subjectId') subjectId: string) {
    return this.academicService.listLessonsBySubject(subjectId);
  }

  @Post('lessons')
  async createLesson(
    @Body() body: { title: string; description?: string; fileUrl?: string; subjectId: string; classId?: string }
  ) {
    try {
      return await this.academicService.createLesson(body);
    } catch (err: any) {
      console.error('[AcademicController] Falha em POST /academic/lessons:', err);
      throw err;
    }
  }

  @Get('classes/:classId/lessons')
  async listLessonsByClass(@Param('classId') classId: string) {
    return this.academicService.listLessonsByClass(classId);
  }

  @Delete('lessons/:id')
  async deleteLesson(@Param('id') id: string) {
    return this.academicService.deleteLesson(id);
  }

  // ⚡ Exclui submissões de uma atividade para toda a turma
  @Delete('classes/:classId/activities/:quizId/submissions')
  async deleteActivityFromClass(
    @Param('classId') classId: string,
    @Param('quizId') quizId: string,
  ) {
    return this.academicService.deleteActivitySubmissionsFromClass(classId, quizId);
  }

  // ⚡ Exclui a submissão de um aluno específico (Permitir Refazer)
  @Delete('classes/:classId/activities/:quizId/students/:userId/submission')
  async deleteStudentSubmission(
    @Param('classId') classId: string,
    @Param('quizId') quizId: string,
    @Param('userId') userId: string,
  ) {
    return this.academicService.deleteStudentSubmission(classId, quizId, userId);
  }
}