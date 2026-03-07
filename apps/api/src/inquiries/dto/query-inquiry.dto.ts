import { IsOptional, IsEnum } from 'class-validator';
import { InquiryType, InquiryStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryInquiryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(InquiryType)
  type?: InquiryType;

  @IsOptional()
  @IsEnum(InquiryStatus)
  status?: InquiryStatus;
}
