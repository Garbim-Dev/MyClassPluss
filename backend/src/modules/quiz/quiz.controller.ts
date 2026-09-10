import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Request,
  Query, // ⚡ Importação do Query adicionada aqui
} from '@nestjs/common';
import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('quizzes')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() createQuizDto: CreateQuizDto, @Request() req: any) {
    const teacherId = req.user?.id || req.user?.sub;
    return this.quizService.create(createQuizDto, teacherId);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(
    @Param('id') id: string,
    @Body() updateQuizDto: CreateQuizDto,
    @Request() req: any,
  ) {
    const teacherId = req.user?.id || req.user?.sub;
    return this.quizService.update(id, updateQuizDto, teacherId);
  }

  // ==========================================
  // ⚡ ROTAS ESTÁTICAS DEVEM VIR ANTES DE :id
  // ==========================================

  @Get('sessions/history')
  @UseGuards(AuthGuard('jwt'))
  async findSessionsHistory(@Request() req: any) {
    const teacherId = req.user?.id || req.user?.sub;
    return this.quizService.findSessionsHistory(teacherId);
  }

  @Get('sessions/:id')
  @UseGuards(AuthGuard('jwt'))
  async findSessionDetails(@Param('id') id: string, @Request() req: any) {
    const teacherId = req.user?.id || req.user?.sub;
    return this.quizService.findSessionDetails(id, teacherId);
  }

  // ⚡ Rota estática do Repositório Global
  @Get('global/repository')
  @UseGuards(AuthGuard('jwt'))
  async findGlobalRepository(
    @Request() req: any,
    @Query('area') area?: string,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
  ) {
    return this.quizService.findGlobalRepository({ area, tag, search });
  }

  // ==========================================
  // ROTAS PADRÃO E DINÂMICAS COM :id
  // ==========================================

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Request() req: any) {
    const teacherId = req.user?.id || req.user?.sub;
    return this.quizService.findAll(teacherId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findOne(@Param('id') id: string, @Request() req: any) {
    const teacherId = req.user?.id || req.user?.sub;
    return this.quizService.findOne(id, teacherId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id') id: string, @Request() req: any) {
    const teacherId = req.user?.id || req.user?.sub;
    return this.quizService.remove(id, teacherId);
  }

  @Delete('sessions/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteQuizSession(@Param('id') id: string) {
    return this.quizService.deleteQuizSession(id);
  }

  @Put(':id/publish')
  @UseGuards(AuthGuard('jwt'))
  async togglePublish(
    @Param('id') id: string,
    @Body() body: { isPublic: boolean; knowledgeArea?: string; tags?: string[] },
    @Request() req: any,
  ) {
    const teacherId = req.user?.id || req.user?.sub;
    return this.quizService.togglePublish(id, teacherId, body);
  }

  @Post(':id/clone')
  @UseGuards(AuthGuard('jwt'))
  async cloneQuiz(
    @Param('id') id: string,
    @Body() body: { subjectId?: string },
    @Request() req: any,
  ) {
    const teacherId = req.user?.id || req.user?.sub;
    return this.quizService.cloneQuiz(id, teacherId, body.subjectId);
  }
}