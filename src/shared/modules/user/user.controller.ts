import { Response, Request } from 'express';
import { Config } from 'convict';
import { inject } from 'inversify';
import { Logger } from 'pino';
import { StatusCodes } from 'http-status-codes';
import { Component } from '../../di/component.js';
import { RestSchema } from '../../libs/config/rest.schema.js';
import {
  BaseController,
  DocumentExistsMiddleware,
  HttpError,
  HttpMethod,
  PrivateRouteMiddleware,
  UploadFileMiddleware,
  ValidateDtoMiddleware,
  ValidateObjectIdMiddleware,
} from '../../libs/rest/index.js';
import { UserService } from './types/user-service.interface.js';
import { fillDTO } from '../../helpers/common.js';
import { UserRdo } from './rdo/user.rdo.js';
import { CreateUserRequest } from './types/create-user-request.type.js';
import { LoginUserRequest } from './types/login-user-request.type.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthService } from '../auth/types/auth-service.interface.js';
import { LoggedUserRdo } from '../offer/rdo/logged-user.rdo.js';

export class UserController extends BaseController {
  constructor(
    @inject(Component.Logger) protected readonly logger: Logger,
    @inject(Component.UserService) private readonly userService: UserService,
    @inject(Component.Config)
    private readonly configService: Config<RestSchema>,
    @inject(Component.AuthService) private readonly authService: AuthService
  ) {
    super(logger);
    this.logger.info('Register routes for UserController...');

    this.addRoute({
      path: '/register',
      method: HttpMethod.Post,
      handler: this.register,
      middlewares: [new ValidateDtoMiddleware(CreateUserDto)],
    });

    this.addRoute({
      path: '/login',
      method: HttpMethod.Post,
      handler: this.login,
      middlewares: [new ValidateDtoMiddleware(LoginDto)],
    });

    this.addRoute({
      path: '/login',
      method: HttpMethod.Get,
      handler: this.checkAuth,
      middlewares: [new PrivateRouteMiddleware()],
    });

    this.addRoute({
      path: '/logout',
      method: HttpMethod.Post,
      handler: this.logout,
    });

    this.addRoute({
      path: '/:userId/avatar',
      method: HttpMethod.Post,
      handler: this.uploadAvatar,
      middlewares: [
        new ValidateObjectIdMiddleware('userId'),
        new DocumentExistsMiddleware(this.userService, 'User', 'userId'),
        new UploadFileMiddleware(
          this.configService.get('UPLOAD_DIRECTORY'),
          'avatar'
        ),
      ],
    });
  }

  public async register(
    { body }: CreateUserRequest,
    res: Response
  ): Promise<void> {
    const existsUser = await this.userService.findByEmail(body.email);

    if (existsUser) {
      throw new HttpError(
        StatusCodes.CONFLICT,
        `User with email «${body.email}» exists.`,
        'UserController'
      );
    }

    const result = await this.userService.create(
      body,
      this.configService.get('SALT')
    );

    this.created(res, fillDTO(UserRdo, result));
  }

  public async login({ body }: LoginUserRequest, res: Response): Promise<void> {
    const user = await this.authService.verify(body);
    const token = await this.authService.authenticate(user);
    const responseData = fillDTO(LoggedUserRdo, {
      email: user.email,
      token,
    });
    this.ok(res, responseData);
  }

  public async checkAuth({ tokenPayload: { email } }: Request, res: Response) {
    const foundedUser = await this.userService.findByEmail(email);

    if (!foundedUser) {
      throw new HttpError(
        StatusCodes.UNAUTHORIZED,
        'Unauthorized',
        'UserController'
      );
    }

    this.ok(res, fillDTO(LoggedUserRdo, foundedUser));
  }

  public async logout(_req: Request, res: Response): Promise<void> {
    this.noContent(res, {});
  }

  public async uploadAvatar(req: Request, res: Response) {
    if (!req.file?.path) {
      throw new HttpError(
        StatusCodes.BAD_REQUEST,
        'Avatar is missing',
        'UserController'
      );
    }

    this.userService.updateAvatar(req.params.userId, req.file?.path);

    this.created(res, {
      filepath: req.file?.path,
    });
  }
}
