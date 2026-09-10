export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FAST_ANSWER' | 'SLIDER' | 'PUZZLE' | string;

export class CreateQuestionOptionDto {
  text!: string;
  color?: string;
  isCorrect?: boolean;
  correctOrder?: number;
}

export class CreateQuestionDto {
  title!: string;
  imageUrl?: string;
  type!: QuestionType;
  timeLimitSeconds!: number;
  points?: number;
  order?: number;
  sliderConfig?: any;
  options?: CreateQuestionOptionDto[];
}

export class CreateQuizDto {
  title!: string;
  description?: string;
  type!: string;
  subjectId!: string;
  questions!: CreateQuestionDto[];
}