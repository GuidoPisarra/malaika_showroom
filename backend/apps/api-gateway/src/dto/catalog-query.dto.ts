import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const toList = ({ value }: { value: unknown }) =>
  value === undefined || value === '' ? undefined : (Array.isArray(value) ? value : String(value).split(',')).map(String);

export class ProductQuery {
  @IsOptional() @IsString() @MaxLength(100)
  search?: string;

  @IsOptional() @IsString() @MaxLength(40)
  category?: string;

  @IsOptional() @IsString() @MaxLength(40)
  occasion?: string;

  @IsOptional() @Transform(toList) @IsString({ each: true })
  sizes?: string[];

  @IsOptional() @Transform(toList) @IsString({ each: true })
  colors?: string[];

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  minPrice?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  maxPrice?: number;

  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean()
  onlyInStock?: boolean;

  @IsOptional() @IsIn(['featured', 'price-asc', 'price-desc', 'rating', 'newest'])
  sortBy?: 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'newest';
}

export class PageQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  pageSize?: number;

  @IsOptional() @IsString() @MaxLength(100)
  search?: string;
}
