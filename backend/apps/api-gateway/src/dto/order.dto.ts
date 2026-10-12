import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ShippingDto {
  @IsString() @MinLength(3, { message: 'Ingresá tu nombre completo' }) @MaxLength(120)
  fullName: string;

  @IsEmail({}, { message: 'Ingresá un correo electrónico válido' })
  email: string;

  @IsString() @MinLength(8, { message: 'Ingresá un teléfono de contacto válido' }) @MaxLength(40)
  phone: string;

  @IsString() @MinLength(5, { message: 'Ingresá tu dirección y número de entrega' }) @MaxLength(200)
  address: string;

  @IsOptional() @IsString() @MaxLength(60)
  apartment?: string;

  @IsString() @MinLength(1, { message: 'Ingresá tu ciudad' }) @MaxLength(80)
  city: string;

  @IsString() @MaxLength(80)
  provinceState: string;

  @IsString() @MinLength(1, { message: 'Ingresá tu código postal' }) @MaxLength(20)
  postalCode: string;

  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}

export class OrderLineDto {
  @IsString() @MaxLength(64)
  productId: string;

  @IsInt() @Min(1) @Max(20)
  quantity: number;

  @IsOptional() @IsString() @MaxLength(20)
  size?: string;

  @IsOptional() @IsString() @MaxLength(60)
  color?: string;
}

export class CreateOrderDto {
  @ValidateNested() @Type(() => ShippingDto)
  customer: ShippingDto;

  @ValidateNested({ each: true }) @Type(() => OrderLineDto) @ArrayMinSize(1) @ArrayMaxSize(50)
  items: OrderLineDto[];

  @IsOptional() @IsString() @MaxLength(40)
  couponCode?: string;

  /** credit-card y mercado-pago van ambos a Checkout Pro. */
  @IsIn(['mercado-pago', 'credit-card', 'bank-transfer'])
  paymentMethod: 'mercado-pago' | 'credit-card' | 'bank-transfer';
}

export class ValidateCouponDto {
  @IsString() @MaxLength(40)
  code: string;

  @IsOptional() @IsInt() @Min(0)
  subtotal?: number;
}

export class TrackOrderQuery {
  @IsEmail({}, { message: 'Ingresá el correo con el que hiciste la compra' })
  email: string;
}

export class SaveLookDto {
  @IsString() @MinLength(1) @MaxLength(80)
  name: string;

  @IsString({ each: true }) @ArrayMinSize(1) @ArrayMaxSize(10)
  itemIds: string[];
}
