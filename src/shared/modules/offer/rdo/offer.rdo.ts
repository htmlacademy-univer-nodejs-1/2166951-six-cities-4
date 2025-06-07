import { Expose, Type } from 'class-transformer';
import { City, HousingType, Amenity } from '../../../types/index.js';
import { CoordinatesRdo } from './coordinates.rdo.js';
import { UserRdo } from '../../user/index.js';

export class OfferRdo {
  @Expose()
  public id: string;

  @Expose()
  public title: string;

  @Expose()
  public description: string;

  @Expose({ name: 'createdAt' })
  public postDate: string;

  @Expose()
  public city: City;

  @Expose()
  public previewPath: string;

  @Expose()
  public imagePaths: string[];

  @Expose()
  public isPremium: boolean;

  @Expose()
  public isFavorite: boolean;

  @Expose()
  public rating: number;

  @Expose()
  public type: HousingType;

  @Expose()
  public rooms: number;

  @Expose()
  public guests: number;

  @Expose()
  public price: number;

  @Expose()
  public amenities: Amenity[];

  @Expose({ name: 'userId' })
  @Type(() => UserRdo)
  public owner: UserRdo;

  @Expose()
  public commentsCount: number;

  @Expose()
  @Type(() => CoordinatesRdo)
  public coordinates: CoordinatesRdo;
}
