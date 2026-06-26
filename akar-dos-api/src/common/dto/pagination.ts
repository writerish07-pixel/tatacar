import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Standard pagination + sorting query params (Master Spec §11). */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Marker wrapper returned by services for list endpoints. The response
 * interceptor unwraps it into `data` + paginated `meta`.
 */
export class PaginatedResult<T> {
  readonly __paginated = true as const;
  constructor(
    public readonly data: T[],
    public readonly meta: PaginationMeta,
  ) {}

  static of<T>(data: T[], total: number, page: number, pageSize: number): PaginatedResult<T> {
    return new PaginatedResult<T>(data, {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  }
}

export function isPaginatedResult(value: unknown): value is PaginatedResult<unknown> {
  return typeof value === 'object' && value !== null && (value as { __paginated?: unknown }).__paginated === true;
}
