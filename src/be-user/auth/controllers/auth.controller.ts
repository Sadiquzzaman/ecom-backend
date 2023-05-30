import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UsePipes,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import {
  ChangePasswordDto,
  DtoValidationPipe,
  LoginDto,
  PhoneOrEmailDto,
  ResponseDto,
  ResponseService,
  UserDto,
  UserResponseDto,
  ResetPasswordDto,
  SystemException,
  GoogleClientIdDTO,
  GoogleSignInDto,
  CreateUserDto,
} from '@simec/ecom-common';
import { OAuth2Client } from 'google-auth-library';  
import fetch from "node-fetch";
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly responseService: ResponseService,
  ) {}

  @ApiCreatedResponse({
    status: HttpStatus.OK,
    description: 'Login is successful',
  })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body(
      new DtoValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    loginDto: LoginDto,
  ) {
    const payload = this.authService.login(loginDto);
    return this.responseService.toResponse<UserResponseDto>(
      HttpStatus.OK,
      'Login is successful',
      payload,
    );
  }

  @ApiCreatedResponse({
    status: HttpStatus.OK,
    description: 'Email is sent with password changed url',
  })
  @HttpCode(HttpStatus.OK)
  @Post('forget-password')
  async forgetPassword(
    @Body(
      new DtoValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    phoneOrEmailDto: PhoneOrEmailDto,
  ): Promise<ResponseDto> {
    const payload = this.authService.forgetPassword(phoneOrEmailDto);
    return this.responseService.toResponse<UserDto>(
      HttpStatus.OK,
      'Email is sent with password changed url',
      payload,
    );
  }

  @ApiCreatedResponse({
    status: HttpStatus.OK,
    description: 'Password is changed successfully!! You can login now!',
  })
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  async changePassword(
    @Body(
      new DtoValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    changePasswordDto: ChangePasswordDto,
  ): Promise<ResponseDto> {
    const payload = this.authService.changePassword(changePasswordDto);
    return this.responseService.toResponse<UserDto>(
      HttpStatus.OK,
      'Password is changed successfully!! You can login now!',
      payload,
    );
  }

  @ApiCreatedResponse({
    status: HttpStatus.OK,
    description: 'Password is re-set successfully!! You can login now!',
  })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(
    @Body(
      new DtoValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    resetPasswordDto: ResetPasswordDto,
  ): Promise<ResponseDto> {
    const payload = this.authService.resetPassword(resetPasswordDto);
    return this.responseService.toResponse<UserDto>(
      HttpStatus.OK,
      'Password is re-set successfully!! You can login now!',
      payload,
    );
  }

  @ApiCreatedResponse({
    status: HttpStatus.OK,
    description: 'Facebook signin is successful',
  })
  @HttpCode(HttpStatus.OK)
  @Post('facebook-auth')
  async facebookAuth(
    @Body(
      new DtoValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    GoogleClientIdDTO: GoogleClientIdDTO,
  ): Promise<ResponseDto> {
    try {
      // Get Data From Facebook Graph API. 
      const facebookGraphUrl = 'https://graph.facebook.com/v10.0/me?access_token='+GoogleClientIdDTO.idToken+"&fields=name%2Cemail%2Cpicture%2Cfirst_name%2Clast_name&method=get&pretty=0&sdk=joey&suppress_http_code=1"; 

      const response = await fetch(facebookGraphUrl);  
      const body = await response.json(); 
      
      if(body.error){
        throw new SystemException({
          status: HttpStatus.BAD_REQUEST,
          message: body.error.message ?? 'Invalid token',
        });
      }
      const googleSignInDto: GoogleSignInDto = {
        email: body?.email,
        fullName: body?.name,
        firstName: body?.first_name,
        lastName: body?.last_name,
        profileImageUrl: body?.picture?.data?.url,
      };

      const payload = this.authService.socialLogin(googleSignInDto);
      return this.responseService.toResponse<UserResponseDto>(
        HttpStatus.OK,
        'Facebook signin successful',
        payload,
      );
    } catch (error) {
      throw new SystemException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Sorry, your id facebook is not valid !!!.',
      });
    }
  }

  // @ApiCreatedResponse({
  //   status: HttpStatus.OK,
  //   description: 'Facebook signin is successful',
  // })
  // @HttpCode(HttpStatus.OK)
  // @Post('facebook-auth')
  // async facebookAuth(
  //   @Body(
  //     new DtoValidationPipe({
  //       whitelist: true,
  //       forbidNonWhitelisted: true,
  //     }),
  //   )
  //   googleSignInDto: GoogleSignInDto,
  // ): Promise<ResponseDto> {
  //   try {
  //     // console.log('Here');

  //     const payload = this.authService.socialLogin(googleSignInDto);
  //     return this.responseService.toResponse<UserResponseDto>(
  //       HttpStatus.OK,
  //       'Facebook signin successful',
  //       payload,
  //     );
  //   } catch (error) {
  //     throw new SystemException({
  //       status: HttpStatus.BAD_REQUEST,
  //       message: 'Sorry, your id facebook is not valid !!!.',
  //     });
  //   }
  // }

  @ApiCreatedResponse({
    status: HttpStatus.OK,
    description: 'google signin is successful',
  })
  @HttpCode(HttpStatus.OK)
  @Post('google-auth')
  async googleAuth(
    @Body(
      new DtoValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    googleClientID: GoogleClientIdDTO,
  ): Promise<ResponseDto> {
    try {
      const client = await new OAuth2Client(
        googleClientID.idToken,
        'vnzzrXBExZ9WlcJUW6lSe69D',
        // gooleAuthweb.redirect_uris,
      );

      await client.generateAuthUrl({
        access_type: 'offline',
        scope: 'https://www.googleapis.com/auth/userinfo.profile',
      });
      let r;
      try {
        r = await client.verifyIdToken({
          idToken: googleClientID.idToken,
          audience:
            '753066503629-90iacj9ejpb02a1nebdqqre1s8e4bj6s.apps.googleusercontent.com',
        });
      } catch (error) {}
      if (r['payload'].email_verified === false)
        throw new SystemException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Sorry, your id google is not valid !!!.',
        });
      const googleSignInDto: GoogleSignInDto = {
        email: r['payload'].email,
        fullName: r['payload'].name,
        firstName: r['payload'].given_name,
        lastName: r['payload'].family_name,
        profileImageUrl: r['payload'].picture,
      };
      console.log(r);

      const payload = this.authService.socialLogin(googleSignInDto);
      return this.responseService.toResponse<UserResponseDto>(
        HttpStatus.OK,
        'Google Sign In successfully',
        payload,
      );
    } catch (error) {
      throw new SystemException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Sorry, your id google is not valid !!!.',
      });
    }
  }

  
}
