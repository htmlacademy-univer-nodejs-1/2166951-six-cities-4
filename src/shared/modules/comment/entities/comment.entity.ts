import {
  getModelForClass,
  modelOptions,
  prop,
  Ref,
} from '@typegoose/typegoose';
import { OfferEntity } from '../../offer/entities/offer.entity.js';
import { UserEntity } from '../../user/entities/user.entity.js';

@modelOptions({
  schemaOptions: {
    collection: 'comments',
    timestamps: true,
  },
})
export class CommentEntity {
  @prop({ type: String, required: true, trim: true })
  public text: string;

  @prop({ type: Number, required: true })
  public rating: number;

  @prop({ ref: () => UserEntity, required: true })
  public userId: Ref<UserEntity>;

  @prop({ ref: () => OfferEntity, required: true })
  public offerId: Ref<OfferEntity>;
}

export const CommentModel = getModelForClass(CommentEntity);
