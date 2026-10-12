import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { CreateAdminDto, StoreSettingsDto } from './admin.dto.js';

export class CreateTenantDto {
  @Matches(/^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/, { message: 'Solo minúsculas, números y guiones' })
  slug: string;

  @IsString() @MinLength(2) @MaxLength(120)
  name: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  domains?: string[];

  @IsOptional() @ValidateNested() @Type(() => StoreSettingsDto)
  settings?: StoreSettingsDto;

  @ValidateNested() @Type(() => CreateAdminDto)
  admin: CreateAdminDto;
}

export class UpdateTenantDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120)
  name?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  domains?: string[];

  @IsOptional() @IsBoolean()
  active?: boolean;
}
