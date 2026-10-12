import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsHexColor,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PageQuery } from './catalog-query.dto.js';

export class ColorDto {
  @IsString() @MaxLength(60)
  name: string;

  @IsHexColor()
  hex: string;
}

export class ProductDto {
  @IsOptional() @IsString() @MaxLength(60)
  sku?: string | null;

  @IsString() @MinLength(2) @MaxLength(160)
  name: string;

  @IsOptional() @IsString() @MaxLength(200)
  subtitle?: string;

  @IsOptional() @IsString() @MaxLength(5000)
  description?: string;

  @IsInt() @Min(0)
  price: number;

  @IsOptional() @IsInt() @Min(0)
  originalPrice?: number | null;

  @IsString() @MaxLength(40)
  category: string;

  @IsOptional() @IsIn(['top', 'bottom', 'shoes', 'accessory', 'dress'])
  slot?: string;

  @IsUrl({ require_tld: false })
  image: string;

  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsUrl({ require_tld: false }, { each: true })
  gallery?: string[];

  @IsOptional() @ValidateNested({ each: true }) @Type(() => ColorDto) @ArrayMaxSize(30)
  colors?: ColorDto[];

  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(30)
  sizes?: string[];

  @IsOptional() @IsString() @MaxLength(200)
  material?: string;

  @IsOptional() @IsString() @MaxLength(40)
  occasion?: string;

  @IsOptional() @IsBoolean()
  isNew?: boolean;

  @IsOptional() @IsBoolean()
  isTrending?: boolean;

  @IsOptional() @IsNumber() @Min(0) @Max(5)
  rating?: number;

  @IsOptional() @IsInt() @Min(0)
  reviewsCount?: number;

  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(30)
  details?: string[];

  @IsOptional() @IsInt() @Min(0)
  stock?: number;

  @IsOptional() @IsObject()
  silhouette?: Record<string, unknown> | null;

  @IsOptional() @IsIn(['hanger', 'mannequin', 'display-stand'])
  arModelType?: string | null;

  @IsOptional() @IsNumber() @Min(0.1) @Max(5)
  arScale?: number | null;

  @IsOptional() @IsBoolean()
  active?: boolean;

  @IsOptional() @IsInt()
  position?: number;
}

export class StockDto {
  @IsInt() @Min(0)
  stock: number;
}

export class PresetDto {
  @IsString() @MaxLength(120)
  name: string;

  @IsOptional() @IsString() @MaxLength(200)
  subtitle?: string;

  @IsOptional() @IsString() @MaxLength(40)
  tag?: string;

  @IsUrl({ require_tld: false })
  imagePreview: string;

  @IsArray() @IsString({ each: true }) @ArrayMaxSize(10)
  itemIds: string[];

  @IsOptional() @IsInt()
  position?: number;
}

export class HotspotDto {
  @IsString()
  productId: string;

  @IsNumber() @Min(0) @Max(100)
  xPercent: number;

  @IsNumber() @Min(0) @Max(100)
  yPercent: number;

  @IsString() @MaxLength(80)
  label: string;

  @IsOptional() @IsString() @MaxLength(40)
  category?: string;

  @IsOptional() @IsIn(['perchero-dorado', 'maniqui-lujo', 'vitrina-joyas', 'podio-calzado'])
  standType?: string;

  @IsOptional() @IsNumber()
  rotationY?: number | null;
}

export class ZoneDto {
  @IsString() @MaxLength(120)
  name: string;

  @IsOptional() @IsString() @MaxLength(160)
  ambianceTitle?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  description?: string;

  @IsOptional() @IsString() @MaxLength(300)
  bgGradient?: string;

  @IsOptional() @IsHexColor()
  accentColor?: string;

  @IsUrl({ require_tld: false })
  panoramicImage: string;

  @IsOptional() @IsInt()
  position?: number;

  @ValidateNested({ each: true }) @Type(() => HotspotDto) @ArrayMaxSize(30)
  hotspots: HotspotDto[];
}

export class CouponDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{3,40}$/, { message: 'El código admite letras, números, guiones (3 a 40)' })
  code: string;

  @IsOptional() @IsString() @MaxLength(200)
  description?: string;

  @IsOptional() @IsInt() @Min(1) @Max(100)
  percent?: number | null;

  @IsOptional() @IsInt() @Min(1)
  fixedAmount?: number | null;

  @IsOptional() @IsInt() @Min(0)
  minSubtotal?: number | null;

  @IsOptional() @IsInt() @Min(1)
  maxUses?: number | null;

  @IsOptional() @IsDateString()
  startsAt?: string | null;

  @IsOptional() @IsDateString()
  endsAt?: string | null;

  @IsOptional() @IsBoolean()
  active?: boolean;
}

export const ORDER_STATUSES = ['PENDING_PAYMENT', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export class OrderListQuery extends PageQuery {
  @IsOptional() @IsIn(ORDER_STATUSES)
  status?: OrderStatus;
}

export class OrderStatusDto {
  @IsIn(ORDER_STATUSES)
  status: OrderStatus;

  @IsOptional() @IsString() @MaxLength(80)
  trackingNumber?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  adminNotes?: string;
}

export class BundleTierDto {
  @IsInt() @Min(1)
  minItems: number;

  @IsInt() @Min(0) @Max(90)
  percent: number;
}

export class BankTransferDto {
  @IsString() @MaxLength(120) holder: string;
  @IsString() @MaxLength(30) cbu: string;
  @IsString() @MaxLength(60) alias: string;
  @IsString() @MaxLength(80) bank: string;
  @IsOptional() @IsString() @MaxLength(20) cuit?: string;
}

export class StoreSettingsDto {
  @IsOptional() @IsString() @MaxLength(3)
  currency?: string;

  @IsOptional() @Matches(/^[A-Z0-9]{2,6}$/, { message: 'El prefijo de pedidos admite 2 a 6 mayúsculas o números' })
  orderPrefix?: string;

  @IsOptional() @IsInt() @Min(0)
  shippingFee?: number;

  @IsOptional() @IsInt() @Min(0)
  freeShippingThreshold?: number;

  @IsOptional() @ValidateNested({ each: true }) @Type(() => BundleTierDto) @ArrayMaxSize(10)
  bundleDiscounts?: BundleTierDto[];

  @IsOptional() @IsInt() @Min(0) @Max(50)
  bankTransferDiscountPercent?: number;

  @IsOptional() @ValidateNested() @Type(() => BankTransferDto)
  bankTransfer?: BankTransferDto | null;

  @IsOptional() @IsUrl({ require_tld: false, require_protocol: true })
  storefrontUrl?: string;

  @IsOptional() @IsEmail()
  contactEmail?: string | null;

  @IsOptional() @IsString() @MaxLength(40)
  contactPhone?: string | null;
}

export class PaymentSettingsDto {
  @IsOptional() @IsString() @MaxLength(200)
  mpAccessToken?: string | null;

  @IsOptional() @IsString() @MaxLength(200)
  mpPublicKey?: string | null;

  @IsOptional() @IsString() @MaxLength(200)
  mpWebhookSecret?: string | null;
}

export class CreateAdminDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) @MaxLength(128) password: string;
  @IsString() @MinLength(2) @MaxLength(120) name: string;
}

export class UserListQuery extends PageQuery {
  @IsOptional() @IsIn(['CUSTOMER', 'ADMIN'])
  role?: 'CUSTOMER' | 'ADMIN';
}

export class UpdateProductDto extends PartialType(ProductDto) {}
export class UpdateCouponDto extends PartialType(CouponDto) {}
