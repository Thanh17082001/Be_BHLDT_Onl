import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import {
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
  Logger
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Not, Repository } from 'typeorm';
import { PageOptionsDto } from 'src/common/pagination/page-option-dto';
import { ItemDto, PageDto } from 'src/common/pagination/page.dto';
import { PageMetaDto } from 'src/common/pagination/page.metadata.dto';
import { GradeService } from 'src/grade/grade.service';
import { User } from 'src/users/entities/user.entity';
import { Role } from 'src/role/role.enum';
import { School } from 'src/schools/entities/school.entity';
import { schoolTypes } from 'src/common/constant/type-school-query';
import { Question } from 'src/question/entities/question.entity';
import { Topic } from 'src/topics/entities/topic.entity';
import { Subject } from 'src/subjects/entities/subject.entity';
import { Part } from 'src/part/entities/part.entity';
import { TypeQuestion } from 'src/type-question/entities/type-question.entity';
import { Level } from 'src/level/entities/level.entity';
import { AnswerService } from 'src/answer/answer.service';
import { RandomQuestionDto } from './dto/randoom-question.dto';

@Injectable()
export class QuestionService {
  private readonly logger = new Logger(QuestionService.name)
  constructor(
    @InjectRepository(Question) private repo: Repository<Question>,
    @InjectRepository(Question) private repoQuestion: Repository<Question>,
    @InjectRepository(School) private repoSchool: Repository<School>,
    @InjectRepository(Topic) private repoTopic: Repository<Topic>,
    @InjectRepository(Subject) private repoSubject: Repository<Subject>,
    @InjectRepository(Part) private repoPart: Repository<Part>,
    @InjectRepository(TypeQuestion) private repoTypeQuestion: Repository<TypeQuestion>,
    @InjectRepository(Level) private repoLevel: Repository<Level>,
    private readonly answerService: AnswerService,

  ) { }
  async create(
    createQuestionDto: CreateQuestionDto,
    user: User,
  ): Promise<Question> {
    const { content, schoolId, answers, subjectId, partId, topicId, typeQuestionId, levelId, score, numberOfAnswers } = createQuestionDto;
    console.log(createQuestionDto);
    createQuestionDto.schoolId = user?.school?.id;
    const school = await this.repoSchool.findOne({
      where: { id: createQuestionDto.schoolId },
    });

    const subject: Subject = await this.repoSubject.findOne({
      where: { id: subjectId },
    });
    const part: Part = await this.repoPart.findOne({
      where: { id: partId },
    });
    const topic: Topic = await this.repoTopic.findOne({
      where: { id: topicId },
    });
    const typeQuestion: TypeQuestion = await this.repoTypeQuestion.findOne({
      where: { id: typeQuestionId },
    });
    const level: Level = await this.repoLevel.findOne({
      where: { id: levelId },
    });




    const newQuestion = this.repo.create({
      content,
      score,
      subject,
      part,
      topic,
      typeQuestion,
      level,
      numberOfAnswers,
      createdBy: user,
      school: school,
    });
    const question: Question = await this.repo.save(newQuestion);

    const dataAnswer = []

    for (let i = 0; i < answers.length; i++) {
      answers[i].questionId = question.id;
      if (answers[i].content == undefined || answers[i].content == '') {

      }
      else {
        dataAnswer.push(await this.answerService.create(answers[i], user));
      }
    }
    return question;
  }

  async findAll(
    pageOptions: PageOptionsDto,
    query: Partial<Question>,
    user: User,
  ): Promise<PageDto<Question>> {
    const queryBuilder = this.repo
      .createQueryBuilder('question')
      .leftJoinAndSelect(
        'question.subject',
        'subject',
      )
      .leftJoinAndSelect(
        'question.part',
        'part',
      )
      .leftJoinAndSelect(
        'question.topic',
        'topic',
      )
      .leftJoinAndSelect(
        'question.typeQuestion',
        'typeQuestion',
      )
      .leftJoinAndSelect(
        'question.level',
        'level',
      )
      .leftJoinAndSelect(
        'question.answers',
        'answers',
      )
      .leftJoinAndSelect('question.school', 'school')
      .leftJoinAndSelect('school.users', 'users')
    // Lấy danh sách giáo viên phụ trách môn học


    const { page, take, skip, order, search } = pageOptions;
    const pagination: string[] = ['page', 'take', 'skip', 'order', 'search'];

    // 🎯 Phân quyền dữ liệu
    if (user) {
      const schoolTypesQuery = schoolTypes(user);

      queryBuilder.andWhere(
        new Brackets((qb) => {
          if (user.role === Role.TEACHER) {
            const subjectIds = user.subjects?.map((subject) => subject.id) || [];
            if (subjectIds.length > 0) {
              qb.where('subject.id IN (:...subjectIds)', { subjectIds })
                .orWhere('question.created_by = :created_by', { created_by: user.id })
                .orWhere('school.isAdmin = :isAdmin', { isAdmin: true });
            }
          } else if (user.role === Role.PRINCIPAL) {
            qb.where('school.id = :schoolId', { schoolId: user.school.id })
              .orWhere('question.created_by = :created_by', { created_by: user.id })
              .orWhere('school.isAdmin = :isAdmin', { isAdmin: true });
          } else if (user.role === Role.ADMIN) {
            qb.where('school.schoolType IN (:...schoolTypesQuery)', { schoolTypesQuery });
          }
        }),
      );
    }

    // 🎯 Lọc theo điều kiện tìm kiếm (bỏ qua các tham số phân trang)
    if (query && Object.keys(query).length > 0) {
      Object.keys(query).forEach((key) => {
        if (key && !pagination.includes(key)) {
          queryBuilder.andWhere(`question.${key} = :${key}`, {
            [key]: query[key],
          });
        }
      });
    }

    // 🎯 Tìm kiếm theo nội dung câu hỏi (bỏ dấu, không phân biệt hoa thường)
    if (search) {
      queryBuilder.andWhere(
        `LOWER(unaccent("question".content)) ILIKE LOWER(unaccent(:search))`,
        {
          search: `%${search}%`,
        },
      );
    }

    // 🎯 Phân trang và sắp xếp
    queryBuilder.orderBy('question.createdAt', order).skip(skip).take(take);

    const itemCount = await queryBuilder.getCount();
    const { entities } = await queryBuilder.getRawAndEntities();

    return new PageDto(
      entities,
      new PageMetaDto({ pageOptionsDto: pageOptions, itemCount }),
    );
  }

  async findOne(id: number): Promise<ItemDto<Question>> {
    const example = await this.repo.findOne({ where: { id }, relations: ['answers', 'topic', 'subject', 'level', 'part', 'typeQuestion'] });
    if (!example) {
      throw new HttpException('Not found', 404);
    }
    return new ItemDto(example);
  }

  async update(id: number, updateQuestionDto: UpdateQuestionDto) {
    const { content, score } = updateQuestionDto;


    const example: Question = await this.repo.findOne({ where: { id } });
    console.log(example);

    if (!example) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    this.repo.merge(example, { content, score });

    await this.repo.update(id, example);

    return new ItemDto(example);
  }

  async remove(id: number, user: User) {
    const example: Question = await this.repo.findOne({
      where: { id },
      relations: ['createdBy', 'school'],
    });

    if (!example) {
      throw new NotFoundException('Không tìm thấy tài nguyên');
    }
    const isOwner = example?.createdBy?.id === user.id;
    const isSameSchoolType = example?.school?.schoolType === user.school?.schoolType;

    if (!user.isAdmin && !isOwner) {
      throw new ForbiddenException('Không có quyền xóa');
    }

    if (user.isAdmin && !isSameSchoolType) {
      throw new ForbiddenException('Không có quyền xóa');
    }

    if (example?.createdBy.id !== user.id) {
      throw new ForbiddenException('Không có quyền xóa');
    }
    await this.repo.delete(id);
    return new ItemDto(await this.repo.delete(id));
  }

  // lấy câu hỏi ngẫu nhiên
  async getRandomItems(randomQuestionDto: RandomQuestionDto): Promise<Question[]> {
    const levels = randomQuestionDto.levels;
    const result: Question[] = [];

    for (const level of levels) {
      const count = level.count;
      const questions = await this.repo
        .createQueryBuilder('question')
        .leftJoinAndSelect('question.subject', 'subject') // Join quan hệ subject
        .leftJoinAndSelect('question.topic', 'topic') // Join quan hệ topic
        .leftJoinAndSelect('question.part', 'part') // Join quan hệ part
        .leftJoinAndSelect('question.typeQuestion', 'typeQuestion') // Join quan hệ typeQuestion
        .leftJoinAndSelect('question.level', 'level') // Join quan hệ level
        .where('question.subject.id = :subjectId', { subjectId: randomQuestionDto.subjectId })
        .andWhere('question.topic.id = :topicId', { topicId: randomQuestionDto.topicId })
        .andWhere('question.part.id = :partId', { partId: randomQuestionDto.partId })
        .andWhere('question.typeQuestion.id = :typeQuestionId', { typeQuestionId: randomQuestionDto.typeQuestionId })
        .andWhere('question.level.id = :levelId', { levelId: level.levelId }) // Lọc theo mức độ
        .orderBy('RANDOM()') // Sắp xếp ngẫu nhiên
        .limit(count)
        .getMany();

      result.push(...questions);
    }

    return result;
  }

  async createQuestionBySaathi(
    book: string,
    page: number,
    grade: string,
    subject: string,
    imageInput?: { type: 'url' | 'base64'; data: string }
  ) {
    try {
      this.logger.debug(
        `Request Saathi API with: book=${book}, page=${page}, grade=${grade}, subject=${subject}, imageType=${imageInput?.type || 'none'}`,
      );

      const saathiKey = process.env.SAATHI_KEY;
      if (!saathiKey) {
        console.log(
          book, page, grade, subject, imageInput
        )
        throw new HttpException('SAATHI_KEY is missing in environment variables', 500);
      }

      const body: any = {
        user_input: `Tạo bộ câu hỏi trắc nghiệm cho sách ${book}, trang ${page}, lớp ${grade}, môn ${subject}.`,
        system_input: 'Bạn là một AI chuyên tạo câu hỏi kiểm tra kiến thức.',
        saathi_key: saathiKey,
        response_format: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  content: { type: 'string' },          // Question.content
                  score: { type: 'number' },            // Question.score
                  numberOfAnswers: { type: 'number' },  // Question.numberOfAnswers
                  answers: {                             // list answer objects
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        content: { type: 'string' },    // Answer.content
                        isCorrect: { type: 'boolean' }  // Answer.isCorrect
                      },
                      required: ['content', 'isCorrect']
                    }
                  },
                  // optional metadata as names (AI trả label, backend sẽ map)
                  subjectName: { type: 'string' },
                  partName: { type: 'string' },
                  topicName: { type: 'string' },
                  typeQuestionName: { type: 'string' },
                  levelName: { type: 'string' },
                  schoolName: { type: 'string' },

                  // optional image
                  image: { type: 'string' },

                  // optional external id from Saathi
                  saathiId: { type: 'string' }
                },
                required: ['content', 'answers']
              }
            }
          },
          required: ['questions']
        },
        stream: false,
        thinking: true,
      };

      // 👇 Thêm image nếu có
      if (imageInput) {
        if (imageInput.type === 'url') {
          body.image = {
            type: 'image_url',
            image_url: { url: imageInput.data },
          };
        } else if (imageInput.type === 'base64') {
          body.image = {
            type: 'image_url',
            base64: imageInput.data,
          };
        }
      }

      const response = await fetch('https://saathi-core-ai-prod.taghiveapi.com/saathi_lm/inference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Saathi API error: ${response.status} - ${errText}`);
        throw new HttpException(`Saathi API error: ${response.status}`, response.status);
      }

      const data = await response.json();
      this.logger.debug(`Saathi raw response: ${JSON.stringify(data)}`);

      if (data.error) {
        throw new HttpException(`Saathi error: ${data.error}`, 500);
      }
      if (!data.result) {
        throw new HttpException('Empty result from Saathi', 500);
      }

      let parsed;
      try {
        parsed = JSON.parse(data.result);
      } catch (e) {
        this.logger.error(`JSON parse failed. Raw result: ${data.result}`);
        throw new HttpException('Invalid JSON result from Saathi', 500);
      }

      return parsed.questions;
    } catch (err) {
      this.logger.error(`Error while calling Saathi: ${err.message}`, err.stack);
      throw new HttpException(err.message || 'Unexpected error', 500);
    }
  }


}
