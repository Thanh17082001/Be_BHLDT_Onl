import { BadRequestException, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from 'bcrypt';
import { User } from "src/users/entities/user.entity";
import { SignUpDto } from "./dto/sign-up.dto";
import { LoginDto } from "./dto/login.dto";
import { UsersService } from "src/users/users.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

export class AuthService {
  constructor(
     @InjectRepository(User) private repoUser: Repository<User>,
    private jwtService: JwtService,
  ) { }

  // async signUp(data: SignUpDto): Promise<User> {
  
  //   const newUser = await this.usersService.create(data);
  //   return newUser;
  // }

  async logIn(data: LoginDto): Promise<any> {
    
      const user = await this.repoUser?.findOne({where: {username: data.username}});
      if (!user) {
        throw new NotFoundException('Tài khoản hoặc mật khẩu không chính xác');
      }
      const isPass = await bcrypt.compare(data.password, user.password);
      if (!isPass) {
        throw new BadRequestException('Tài khoản hoặc mật khẩu không chính xác');
      }
      const payload = { ...user, password: undefined, };
      const accessToken = this.jwtService.sign(payload, { expiresIn: '60m' });
      console.log({
        ...payload,
        accessToken: accessToken,
      });
      return {
        ...payload,
        accessToken: accessToken,
      };
    
  }

  // async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<any> {
  //   const token = await this.tokenService.findOne({
  //     refreshToken: refreshTokenDto.refreshToken,
  //   });
  //   if (!token || new Date() > token.expiresAt) {
  //     throw new BadRequestException('Refresh token is valid or not exist');
  //   }

  //   await this.tokenService.remove({ _id: token._id });

  //   // Tạo access token mới
  //   const user = await this.usersService.findOne({ _id: token.userId });
  //   const payload = { ...user, password: undefined, passWordFirst: undefined, libraryDetail: user.libraryId, libraryId: user.libraryId._id };
  //   const newAccessToken = await this.jwtService.signAsync(payload, {
  //     expiresIn: '7d',
  //   });

  //   const refreshToken = this.jwtService.sign({ userId: user._id }, { expiresIn: '7d' });


  //   return { ...payload, accessToken: newAccessToken, refreshToken };
  // }


}
