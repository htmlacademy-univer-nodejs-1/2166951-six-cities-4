import { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import {
  BaseController,
  CheckOwnerMiddleware,
  DocumentExistsMiddleware,
  HttpMethod,
  PrivateRouteMiddleware,
  RequestQuery,
  ValidateDtoMiddleware,
  ValidateObjectIdMiddleware,
} from '../../libs/rest/index.js';
import { Component } from '../../di/index.js';
import { Logger } from '../../libs/logger/index.js';
import { fillDTO } from '../../helpers/common.js';
import { DEFAULT_OFFER_COUNT } from './offer.constant.js';
import {
  OfferService,
  OfferRdo,
  CreateOfferDto,
  UpdateOfferDto,
} from './index.js';
import { CreateOfferRequest } from './types/create-offer-request.type.js';
import { City } from '../../types/offer.js';
import { CommentRdo, CommentService } from '../comment/index.js';
import { ParamOfferId } from './types/param-offer-id.type.js';
import { ParamCity } from './types/param-city.type.js';

@injectable()
export class OfferController extends BaseController {
  constructor(
    @inject(Component.Logger) protected readonly logger: Logger,
    @inject(Component.OfferService) private readonly offerService: OfferService,
    @inject(Component.CommentService)
    private readonly commentService: CommentService
  ) {
    super(logger);

    this.logger.info('Register routes for OfferController...');

    this.addRoute({
      path: '/',
      method: HttpMethod.Get,
      handler: this.getAll,
    });

    this.addRoute({
      path: '/favorites',
      method: HttpMethod.Get,
      handler: this.getFavorites,
      middlewares: [new PrivateRouteMiddleware()],
    });

    this.addRoute({
      path: '/:offerId',
      method: HttpMethod.Get,
      handler: this.getOne,
      middlewares: [
        new ValidateObjectIdMiddleware('offerId'),
        new DocumentExistsMiddleware(this.offerService, 'Offer', 'offerId'),
      ],
    });

    this.addRoute({
      path: '/',
      method: HttpMethod.Post,
      handler: this.create,
      middlewares: [
        new PrivateRouteMiddleware(),
        new ValidateDtoMiddleware(CreateOfferDto),
      ],
    });

    this.addRoute({
      path: '/:offerId',
      method: HttpMethod.Patch,
      handler: this.update,
      middlewares: [
        new PrivateRouteMiddleware(),
        new ValidateObjectIdMiddleware('offerId'),
        new ValidateDtoMiddleware(UpdateOfferDto),
        new DocumentExistsMiddleware(this.offerService, 'Offer', 'offerId'),
        new CheckOwnerMiddleware(this.offerService),
      ],
    });

    this.addRoute({
      path: '/:offerId',
      method: HttpMethod.Delete,
      handler: this.delete,
      middlewares: [
        new PrivateRouteMiddleware(),
        new ValidateObjectIdMiddleware('offerId'),
        new DocumentExistsMiddleware(this.offerService, 'Offer', 'offerId'),
        new CheckOwnerMiddleware(this.offerService),
      ],
    });

    this.addRoute({
      path: '/premium/:city',
      method: HttpMethod.Get,
      handler: this.getPremium,
    });

    this.addRoute({
      path: '/:offerId/favorite',
      method: HttpMethod.Post,
      handler: this.addFavorite,
      middlewares: [
        new PrivateRouteMiddleware(),
        new ValidateObjectIdMiddleware('offerId'),
        new DocumentExistsMiddleware(this.offerService, 'Offer', 'offerId'),
      ],
    });

    this.addRoute({
      path: '/:offerId/favorite',
      method: HttpMethod.Delete,
      handler: this.deleteFavorite,
      middlewares: [
        new PrivateRouteMiddleware(),
        new ValidateObjectIdMiddleware('offerId'),
        new DocumentExistsMiddleware(this.offerService, 'Offer', 'offerId'),
      ],
    });

    this.addRoute({
      path: '/:offerId/comments',
      method: HttpMethod.Get,
      handler: this.getComments,
      middlewares: [
        new ValidateObjectIdMiddleware('offerId'),
        new DocumentExistsMiddleware(this.offerService, 'Offer', 'offerId'),
      ],
    });
  }

  public async getAll({ query }: Request<RequestQuery>, res: Response) {
    const limit = parseInt(query.limit as string, 10) || DEFAULT_OFFER_COUNT;

    const offers = await this.offerService.findAll(limit);

    this.ok(res, fillDTO(OfferRdo, offers));
  }

  public async getOne(
    { params: { offerId }, tokenPayload }: Request<ParamOfferId>,
    res: Response
  ) {
    const offer = await this.offerService.findById(offerId, tokenPayload?.id);

    this.ok(res, fillDTO(OfferRdo, offer));
  }

  public async create(
    { body, tokenPayload }: CreateOfferRequest,
    res: Response
  ) {
    const newOffer = await this.offerService.create({
      ...body,
      userId: tokenPayload.id,
    });

    this.created(res, fillDTO(OfferRdo, newOffer));
  }

  public async update(
    {
      body,
      params: { offerId },
    }: Request<ParamOfferId, unknown, UpdateOfferDto>,
    res: Response
  ) {
    const updatedOffer = await this.offerService.updateById(offerId, body);

    this.ok(res, fillDTO(OfferRdo, updatedOffer));
  }

  public async delete(
    { params: { offerId } }: Request<ParamOfferId>,
    res: Response
  ) {
    await this.offerService.deleteById(offerId);

    await this.commentService.deleteByOfferId(offerId);

    this.noContent(res, offerId);
  }

  public async getPremium(
    { params: { city }, tokenPayload }: Request<ParamCity>,
    res: Response
  ) {
    const offers = await this.offerService.findPremiumOffersByCity(
      city as City,
      tokenPayload?.id
    );

    this.ok(res, fillDTO(OfferRdo, offers));
  }

  public async getFavorites({ tokenPayload }: Request, res: Response) {
    const offers = await this.offerService.getUserFavorites(tokenPayload.id);

    this.ok(res, fillDTO(OfferRdo, offers));
  }

  public async addFavorite({ params, tokenPayload }: Request, res: Response) {
    const offer = await this.offerService.addFavorite(
      tokenPayload.id,
      params.offerId
    );

    this.created(res, fillDTO(OfferRdo, offer));
  }

  public async deleteFavorite(
    { params, tokenPayload }: Request,
    res: Response
  ) {
    await this.offerService.deleteFavorite(tokenPayload.id, params.offerId);

    this.noContent(res, {});
  }

  public async getComments(
    { params: { offerId } }: Request<ParamOfferId>,
    res: Response
  ): Promise<void> {
    const comments = await this.commentService.findByOfferId(offerId);

    this.ok(res, fillDTO(CommentRdo, comments));
  }
}
