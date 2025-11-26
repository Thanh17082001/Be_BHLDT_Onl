import { Controller, Get, Post, Body, Put, Param, Delete, UseInterceptors, UploadedFile, UseGuards, Req, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import * as XLSX from 'xlsx';
import { ImportFileExcelUser } from './dto/import-excel.dto';
import { generateUsername } from 'src/utils/generate-username';
import { SchoolsService } from 'src/schools/schools.service';
import { GradeService } from 'src/grade/grade.service';
import { SubjectsService } from 'src/subjects/subjects.service';
import { Public } from 'src/auth/auth.decorator';
import { ChangePassDto } from './dto/change-pass.dto';
import { RolesGuard } from 'src/role/role.guard';
import { Roles } from 'src/role/role.decorator';
import { Role } from 'src/role/role.enum';
import { CreateUserAdminDto } from './dto/create-admin.dto';
import { School } from 'src/schools/entities/school.entity';
import { PageOptionsDto } from 'src/common/pagination/page-option-dto';
import { User } from './entities/user.entity';
import { PageDto } from 'src/common/pagination/page.dto';

@Controller('user')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
    constructor(private readonly userService: UsersService,
        private readonly gradeService: GradeService,
        private readonly schoolService: SchoolsService,
        private readonly subjectService: SubjectsService
    ) { }

    @Post('import-excel')
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('file'))
    async ImportExecl(@UploadedFile() file: Express.Multer.File, @Body() importFileExcel: ImportFileExcelUser, @Req() request: Request) {
        // Đọc dữ liệu từ buffer của file Excel
        const user = request['user'] ?? null;

        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Chuyển đổi sheet thành JSON
        const users = XLSX.utils.sheet_to_json(worksheet);
        const typeSchool = {
            'THPT': ['10', '11', '12'],
            'THCS': ['6', '7', '8', '9'],
            'Tiểu học': ['1', '2', '3', '4', '5'],
            'TH&THCS': ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
            'THCS&THPT': ['6', '7', '8', '9', '10', '11', '12']
        }

        let arraySuccess = [];
        let arrayFail = [];


        let count = 0
        for (const row of users) {

            const fullName = row['HỌ TÊN GIÁO VIÊN']?.toString().trim();
            const schoolName = row['TÊN TRƯỜNG']?.toString().trim();
            const gradeLevels = typeSchool[row['LOẠI TRƯỜNG']] || [];
            const subjectNames = row['MÔN HỌC']?.split(',').map((s: string) => s.trim().toLowerCase()) || [];
            console.log(subjectNames,row);

            // Tạo hoặc tìm trường
            const schoolId = await this.schoolService.findOrCreateByName(schoolName, row['LOẠI TRƯỜNG']);
            // Tạo hoặc tìm các cấp học
            const gradeIds = await this.gradeService.findOrCreateByNames(gradeLevels);

            // // Tạo hoặc tìm các môn học
            const subjectIds = await this.subjectService.findOrCreateByNames(subjectNames, gradeIds, user.school.id, user);
            console.log('đaaaaausaduasdasdasd', subjectIds);
            try {
                const userDto: CreateUserDto = {
                    fullName,
                    username: generateUsername(row['LOẠI TRƯỜNG'], schoolName, fullName),
                    password: '1',
                    role: row['Quyền'] ?? 'Giáo viên',
                    schoolId,
                    gradeIds,
                    subjectIds,
                };
                const user = await this.userService.create(userDto);
                count++;
                if (user) {
                    arraySuccess.push(user, count);
                }
            } catch (error) {
                arrayFail.push({
                    resutl: row,
                    error: error.response,
                })
            }
        }
        return {
            success: arraySuccess,
            errors: arrayFail,
        }
    }

    @Post('import-excel-byPRINCIPAL')
    @Roles(Role.PRINCIPAL)
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('file'))
    async ImportExeclByPRINCIPAL(
        @UploadedFile() file: Express.Multer.File,
        @Body() importFileExcel: ImportFileExcelUser,
        @Req() request: Request
    ) {
        const user = request['user'] ?? null;

        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const users = XLSX.utils.sheet_to_json(worksheet);

        // Mapping theo loại trường
        const typeSchool = {
            'THPT': ['10', '11', '12'],
            'THCS': ['6', '7', '8', '9'],
            'Tiểu học': ['1', '2', '3', '4', '5'],
            'TH&THCS': ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
            'THCS&THPT': ['6', '7', '8', '9', '10', '11', '12']
        };

        let arraySuccess = [];
        let arrayFail = [];

        let count = 0;

        const schoolName = user.school.name;
        const schoolType = user.school.schoolType;   // Ví dụ: 'THCS'
        const gradeLevels = typeSchool[schoolType] || [];

        // Tạo/tìm trường dựa theo user.school
        const schoolId = await this.schoolService.findOrCreateByName(schoolName, schoolType);

        // Tạo/tìm cấp học theo loại trường
        const gradeIds = await this.gradeService.findOrCreateByNames(gradeLevels);

        for (const row of users) {

            const fullName = row['HỌ TÊN GIÁO VIÊN']?.toString().trim();

            const subjectNames = row['MÔN HỌC']?.split(',')
                .map((s: string) => s.trim().toLowerCase()) || [];

            // Tạo hoặc tìm môn học theo cấp học
            const subjectIds = await this.subjectService.findOrCreateByNames(
                subjectNames,
                gradeIds,
                user.school.id,
                user
            );

            try {
                const userDto: CreateUserDto = {
                    fullName,
                    username: generateUsername(schoolType, schoolName, fullName),
                    password: '1',
                    role: 'Giáo viên',
                    schoolId,
                    gradeIds,
                    subjectIds,
                };

                const createdUser = await this.userService.create(userDto);
                count++;

                arraySuccess.push({
                    user: createdUser,
                    index: count
                });

            } catch (error) {
                arrayFail.push({
                    rowData: row,
                    error: error.response ?? error
                });
            }
        }

        return {
            success: arraySuccess,
            errors: arrayFail
        };
    }
    @Post()
    @Roles(Role.ADMIN, Role.PRINCIPAL) 
    async createprincipalorteacher (@Body() createUserDto: CreateUserDto, @Req() request: Request) {
        const user = await this.userService.create(createUserDto);
        return user;
    }
    @Post('admin')
    @Public()
    async create(@Body() createUserDto: CreateUserAdminDto) {
        const school: any = await this.schoolService.findByTypeSchoolIsAdmin(createUserDto.schoolType);
        const schoolType = {
            'Tiểu học': 'TH',
            'THCS': 'THCS',
            'THPT': 'THPT',
        }
        const userDto: CreateUserDto = {
            fullName: `Quản Trị Viên ${schoolType[createUserDto.schoolType]}`,
            username: `admin${schoolType[createUserDto.schoolType]}`,
            role: 'Quản trị viên',
            password: '1',
            schoolId: school?.id,
            gradeIds: [],
            subjectIds: [],
            isAdmin: true,
        };
        const user = await this.userService.create(userDto);
        return user;
    }
    @Get('findallbyschool')
    @Roles(Role.PRINCIPAL, Role.TEACHER)
    async findAllBySchool(
        @Query() pageOptions: PageOptionsDto,
        @Query() query: Partial<User>,
        @Req() request: Request
    ): Promise<PageDto<User>> {
        const user = request['user'] ?? null;
        return this.userService.findAllBySchool(pageOptions, query, user);
    }
    @Get()
    @Public()
    async findAll(
        @Query() pageOptions: PageOptionsDto,
        @Query() query: Partial<User>,
    ): Promise<PageDto<User>> {
        return this.userService.findAll(pageOptions, query);
    }
    @Post('change-password')
    async changePassword(@Body() dto: ChangePassDto) {
        const { userId, password, newPassword } = dto;
        const user = await this.userService.changePassword({ userId, password, newPassword });
        return user;
    }
}
