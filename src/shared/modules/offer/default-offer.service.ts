import { inject, injectable } from 'inversify';
import { DocumentType, types } from '@typegoose/typegoose';
import { Logger } from '../../libs/logger/index.js';
import { Component } from '../../di/index.js';
import { OfferService } from './types/offer-service.interface.js';
import { City } from '../../types/offer.js';
import { OfferEntity } from './entities/offer.entity.js';
import { CreateOfferDto } from './dto/create-offer.dto.js';
import { UpdateOfferDto } from './dto/update-offer.dto.js';
import {
  DEFAULT_OFFER_COUNT,
  DEFAULT_PREMIUM_OFFER_COUNT,
  DEFAULT_SORT_TYPE,
} from './offer.constant.js';
import { CommentEntity } from '../comment/entities/comment.entity.js';
import { FavoriteEntity } from '../favorite/entities/favorite.entity.js';

@injectable()
export class DefaultOfferService implements OfferService {
  constructor(
    @inject(Component.Logger) private readonly logger: Logger,
    @inject(Component.OfferModel)
    private readonly offerModel: types.ModelType<OfferEntity>,
    @inject(Component.FavoriteModel)
    private readonly favoriteModel: types.ModelType<FavoriteEntity>,
    @inject(Component.CommentModel)
    private readonly commentModel: types.ModelType<CommentEntity>
  ) {}

  public async create(
    dto: CreateOfferDto
  ): Promise<types.DocumentType<OfferEntity>> {
    const result = await this.offerModel.create(dto);
    this.logger.info(`New offer created: ${dto.title}`);
    return result;
  }

  public async findAll(
    count?: number,
    userId?: string
  ): Promise<DocumentType<OfferEntity>[]> {
    const offers = await this.offerModel
      .find()
      .limit(count ?? DEFAULT_OFFER_COUNT)
      .sort({ createdAt: DEFAULT_SORT_TYPE })
      .populate('userId')
      .exec();

    return this.getWithFavorites(offers, userId);
  }

  public async findById(
    offerId: string,
    userId?: string
  ): Promise<types.DocumentType<OfferEntity> | null> {
    const offer = await this.offerModel
      .findById(offerId)
      .populate('userId')
      .exec();

    if (!offer) {
      return null;
    }

    return this.getOneWithFavorite(offer, userId);
  }

  public async deleteById(
    offerId: string
  ): Promise<DocumentType<OfferEntity> | null> {
    return this.offerModel.findByIdAndDelete(offerId).exec();
  }

  public async updateById(
    offerId: string,
    dto: UpdateOfferDto
  ): Promise<DocumentType<OfferEntity> | null> {
    return this.offerModel
      .findByIdAndUpdate(offerId, dto, { new: true })
      .populate('userId')
      .exec();
  }

  public async exists(documentId: string): Promise<boolean> {
    return (await this.offerModel.exists({ _id: documentId })) !== null;
  }

  public async incCommentCount(
    offerId: string
  ): Promise<DocumentType<OfferEntity> | null> {
    return this.offerModel
      .findByIdAndUpdate(offerId, {
        $inc: {
          commentsCount: 1,
        },
      })
      .exec();
  }

  public async findPremiumOffersByCity(
    city: City,
    userId: string
  ): Promise<DocumentType<OfferEntity>[]> {
    const offers = await this.offerModel
      .find({ city, isPremium: true })
      .limit(DEFAULT_PREMIUM_OFFER_COUNT)
      .sort({ createdAt: DEFAULT_SORT_TYPE })
      .populate('userId')
      .exec();

    return this.getWithFavorites(offers, userId);
  }

  public async updateRating(
    offerId: string
  ): Promise<DocumentType<OfferEntity> | null> {
    const comments = await this.commentModel.find({ offerId }).exec();

    const ratings = comments.map((comment) => comment.rating);
    const totalRating = ratings.reduce((acc, rating) => acc + rating, 0);
    const avgRating = ratings.length ? totalRating / ratings.length : 0;

    return this.offerModel
      .findByIdAndUpdate(offerId, { rating: avgRating }, { new: true })
      .exec();
  }

  public async getUserFavorites(
    userId: string
  ): Promise<types.DocumentType<OfferEntity>[]> {
    const favorites = await this.favoriteModel.find({ userId }).exec();
    const offerIds = favorites.map((favorite) => favorite.offerId);

    return this.offerModel
      .find({ _id: { $in: offerIds } })
      .populate('userId')
      .exec();
  }

  public async addFavorite(
    userId: string,
    offerId: string
  ): Promise<types.DocumentType<OfferEntity>> {
    const existing = await this.favoriteModel
      .findOne({ userId, offerId })
      .exec();

    if (!existing) {
      await this.favoriteModel.create({ userId, offerId });
    }

    const offer = await this.offerModel.findById(offerId).exec();

    if (!offer) {
      throw new Error('Offer not found');
    }

    offer.isFavorite = true;

    return offer;
  }

  public async deleteFavorite(userId: string, offerId: string): Promise<void> {
    await this.favoriteModel.deleteOne({ userId, offerId });
  }

  private async getWithFavorites(
    offers: DocumentType<OfferEntity>[],
    userId?: string
  ): Promise<DocumentType<OfferEntity>[]> {
    if (!userId) {
      return offers.map((offer) => {
        offer.isFavorite = false;
        return offer;
      });
    }

    const favorites = await this.favoriteModel
      .find({ userId })
      .lean<{ offerId: string }[]>()
      .exec();

    const offerIds = new Set(
      favorites.map((favorite) => favorite.offerId.toString())
    );

    return offers.map((offer) => {
      offer.isFavorite = offerIds.has(offer._id.toString());
      return offer;
    });
  }

  private async getOneWithFavorite(
    offer: DocumentType<OfferEntity>,
    userId?: string
  ): Promise<DocumentType<OfferEntity>> {
    if (!userId) {
      offer.isFavorite = false;
      return offer;
    }

    const isFavorite = await this.favoriteModel
      .findOne({ userId, offerId: offer.id })
      .exec();

    offer.isFavorite = Boolean(isFavorite);

    return offer;
  }
}
