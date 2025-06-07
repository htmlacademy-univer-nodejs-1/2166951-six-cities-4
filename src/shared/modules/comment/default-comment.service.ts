import { DocumentType, types } from '@typegoose/typegoose';
import { inject, injectable } from 'inversify';
import { CommentService } from './types/comment-service.interface.js';
import { Component } from '../../di/component.js';
import { CommentEntity } from './entities/comment.entity.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import {
  DEFAULT_COMMENT_COUNT,
  DEFAULT_SORT_TYPE,
} from './comment.constants.js';

@injectable()
export class DefaultCommentService implements CommentService {
  constructor(
    @inject(Component.CommentModel)
    private readonly commentModel: types.ModelType<CommentEntity>
  ) {}

  public async create(
    dto: CreateCommentDto
  ): Promise<DocumentType<CommentEntity>> {
    const comment = await this.commentModel.create(dto);
    return comment.populate('userId');
  }

  public async findByOfferId(
    offerId: string
  ): Promise<DocumentType<CommentEntity>[]> {
    return this.commentModel
      .find({ offerId })
      .limit(DEFAULT_COMMENT_COUNT)
      .sort({ createdAt: DEFAULT_SORT_TYPE })
      .populate('userId');
  }

  public async deleteByOfferId(offerId: string): Promise<number | null> {
    const result = await this.commentModel.deleteMany({ offerId }).exec();
    return result.deletedCount;
  }
}
