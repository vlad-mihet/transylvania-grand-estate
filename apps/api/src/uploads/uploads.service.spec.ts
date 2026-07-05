import { UploadsService } from './uploads.service';
import { StorageService } from './storage/storage.interface';
import { AgentsService } from '../agents/agents.service';
import { DevelopersService } from '../developers/developers.service';
import { CitiesService } from '../cities/cities.service';
import { ArticlesService } from '../articles/articles.service';
import { CoursesService } from '../academy/courses/courses.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAgentDto } from '../agents/dto/update-agent.dto';
import { UpdateDeveloperDto } from '../developers/dto/update-developer.dto';
import { UpdateCityDto } from '../cities/dto/update-city.dto';
import { UpdateArticleDto } from '../articles/dto/update-article.dto';
import { UpdateCourseDto } from '../academy/courses/dto/courses.dto';
import { SiteConfigService } from '../site-config/site-config.service';
import { LessonProgressService } from '../academy/progress/lesson-progress.service';

/**
 * `extractStoragePath` is the bridge between stored public URLs and the
 * storage layer's flat key namespace. Replace/delete cleanups across every
 * upload-owning service (agents, developers, cities, courses, properties)
 * route through it, so the contract is locked here.
 *
 * The two URL shapes we need to round-trip:
 *  - Local dev:   `/uploads/<directory>/<file>`
 *  - R2 prod:     `https://<r2-host>/<directory>/<file>`
 *
 * Plus the negative paths — anything that doesn't belong to our storage
 * layer must return null so the caller skips the delete instead of feeding
 * the wrong key to S3 / fs.
 */
describe('UploadsService.extractStoragePath', () => {
  const stubStorage: StorageService = {
    upload: jest.fn(),
    uploadFromUrl: jest.fn(),
    delete: jest.fn(),
    getPublicUrl: (filePath: string) => `/uploads/${filePath}`,
  };
  const service = new UploadsService(stubStorage);

  it('strips local dev /uploads/ prefix', () => {
    expect(
      service.extractStoragePath('/uploads/agents/abc.jpg', 'agents'),
    ).toBe('agents/abc.jpg');
  });

  it('strips R2 absolute URL prefix', () => {
    expect(
      service.extractStoragePath(
        'https://pub-xxx.r2.dev/agents/abc.jpg',
        'agents',
      ),
    ).toBe('agents/abc.jpg');
  });

  it('handles nested directories like academy/courses/<id>', () => {
    expect(
      service.extractStoragePath(
        '/uploads/academy/courses/course-1/cover.jpg',
        'academy/courses/course-1',
      ),
    ).toBe('academy/courses/course-1/cover.jpg');
  });

  it('returns null for seed-baked /images/ static paths', () => {
    // Critical: cities.image often points at /images/cities/placeholder.jpg
    // (seeded, not uploaded). A naive prefix strip would feed a bogus key
    // to S3.delete; we must skip these instead.
    expect(
      service.extractStoragePath('/images/cities/placeholder.jpg', 'cities'),
    ).toBeNull();
  });

  it('returns null for URLs whose directory marker does not match', () => {
    // A developer.logo URL must not be deletable via the agents directory.
    expect(
      service.extractStoragePath('/uploads/developers/abc.jpg', 'agents'),
    ).toBeNull();
  });

  it('returns null for null / undefined / empty inputs', () => {
    expect(service.extractStoragePath(null, 'agents')).toBeNull();
    expect(service.extractStoragePath(undefined, 'agents')).toBeNull();
    expect(service.extractStoragePath('', 'agents')).toBeNull();
  });
});

describe('UploadsService.deleteByPublicUrl', () => {
  it('skips the storage delete when the URL is not ours', async () => {
    const deleteFn = jest.fn();
    const stubStorage: StorageService = {
      upload: jest.fn(),
      uploadFromUrl: jest.fn(),
      delete: deleteFn,
      getPublicUrl: (filePath: string) => `/uploads/${filePath}`,
    };
    const service = new UploadsService(stubStorage);

    await service.deleteByPublicUrl('/images/cities/placeholder.jpg', 'cities');
    await service.deleteByPublicUrl(null, 'cities');
    await service.deleteByPublicUrl(undefined, 'cities');

    expect(deleteFn).not.toHaveBeenCalled();
  });

  it('forwards the extracted key when the URL belongs to us', async () => {
    const deleteFn = jest.fn().mockResolvedValue(undefined);
    const stubStorage: StorageService = {
      upload: jest.fn(),
      uploadFromUrl: jest.fn(),
      delete: deleteFn,
      getPublicUrl: (filePath: string) => `/uploads/${filePath}`,
    };
    const service = new UploadsService(stubStorage);

    await service.deleteByPublicUrl('/uploads/agents/abc.jpg', 'agents');

    expect(deleteFn).toHaveBeenCalledWith('agents/abc.jpg');
  });

  it('swallows storage errors so cleanup never blocks the caller', async () => {
    const deleteFn = jest.fn().mockRejectedValue(new Error('S3 unreachable'));
    const stubStorage: StorageService = {
      upload: jest.fn(),
      uploadFromUrl: jest.fn(),
      delete: deleteFn,
      getPublicUrl: (filePath: string) => `/uploads/${filePath}`,
    };
    const service = new UploadsService(stubStorage);

    // The caller treats this as fire-and-forget. If we let the error escape,
    // a transient storage outage would mask successful primary writes.
    await expect(
      service.deleteByPublicUrl('/uploads/agents/abc.jpg', 'agents'),
    ).resolves.toBeUndefined();
  });
});

/**
 * PATCH-path cleanup contract — every service's `update(dto)` method that
 * accepts an upload-managed field MUST clean up the prior asset when the
 * field is replaced. The dedicated upload endpoints (uploadPhoto, etc.)
 * already do this; these tests lock the equivalent behaviour for the
 * regular PATCH path so an admin who swaps a URL via the edit form doesn't
 * silently leak the old object.
 *
 * Contract per service:
 *  - dto.<field> differs from existing.<field> → deleteByPublicUrl called
 *    once with (existing.<field>, '<directory>')
 *  - dto.<field> undefined (field not in body) → deleteByPublicUrl not called
 *  - dto.<field> === existing.<field> (idempotent save) → not called
 */

function buildUploadsSpy() {
  const deleteByPublicUrl = jest.fn().mockResolvedValue(undefined);
  const uploads = { deleteByPublicUrl } as unknown as UploadsService;
  return { uploads, deleteByPublicUrl };
}

describe('AgentsService.update — PATCH cleanup contract', () => {
  const build = (existingPhoto: string | null) => {
    const { uploads, deleteByPublicUrl } = buildUploadsSpy();
    const prisma = {
      agent: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'a1', photo: existingPhoto }),
        update: jest
          .fn()
          .mockImplementation(({ data }: { data: unknown }) =>
            Promise.resolve({ id: 'a1', ...(data as object) }),
          ),
      },
    } as unknown as PrismaService;
    return { service: new AgentsService(prisma, uploads), deleteByPublicUrl };
  };

  it('deletes the prior photo when dto.photo differs', async () => {
    const { service, deleteByPublicUrl } = build('/uploads/agents/old.jpg');
    await service.update('a1', {
      photo: '/uploads/agents/new.jpg',
    } as unknown as UpdateAgentDto);
    expect(deleteByPublicUrl).toHaveBeenCalledWith(
      '/uploads/agents/old.jpg',
      'agents',
    );
  });

  it('skips cleanup when dto.photo is absent from the body', async () => {
    const { service, deleteByPublicUrl } = build('/uploads/agents/old.jpg');
    await service.update('a1', {
      firstName: 'Alice',
    } as unknown as UpdateAgentDto);
    expect(deleteByPublicUrl).not.toHaveBeenCalled();
  });

  it('skips cleanup when dto.photo equals existing photo', async () => {
    const url = '/uploads/agents/same.jpg';
    const { service, deleteByPublicUrl } = build(url);
    await service.update('a1', { photo: url } as unknown as UpdateAgentDto);
    expect(deleteByPublicUrl).not.toHaveBeenCalled();
  });
});

describe('DevelopersService.update — PATCH cleanup contract', () => {
  const build = (
    existingLogo: string | null,
    existingCoverImage: string | null = null,
  ) => {
    const { uploads, deleteByPublicUrl } = buildUploadsSpy();
    const prisma = {
      developer: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'd1',
          logo: existingLogo,
          coverImage: existingCoverImage,
        }),
        update: jest
          .fn()
          .mockImplementation(({ data }: { data: unknown }) =>
            Promise.resolve({ id: 'd1', ...(data as object) }),
          ),
      },
    } as unknown as PrismaService;
    return {
      service: new DevelopersService(prisma, uploads),
      deleteByPublicUrl,
    };
  };

  it('deletes the prior logo when dto.logo differs', async () => {
    const { service, deleteByPublicUrl } = build('/uploads/developers/old.jpg');
    await service.update('d1', {
      logo: '/uploads/developers/new.jpg',
    } as unknown as UpdateDeveloperDto);
    expect(deleteByPublicUrl).toHaveBeenCalledWith(
      '/uploads/developers/old.jpg',
      'developers',
    );
  });

  it('skips cleanup when dto.logo is absent', async () => {
    const { service, deleteByPublicUrl } = build('/uploads/developers/old.jpg');
    await service.update('d1', {
      name: 'Newname',
    } as unknown as UpdateDeveloperDto);
    expect(deleteByPublicUrl).not.toHaveBeenCalled();
  });

  it('skips cleanup when dto.logo equals existing logo', async () => {
    const url = '/uploads/developers/same.jpg';
    const { service, deleteByPublicUrl } = build(url);
    await service.update('d1', {
      logo: url,
    } as unknown as UpdateDeveloperDto);
    expect(deleteByPublicUrl).not.toHaveBeenCalled();
  });

  it('deletes the prior coverImage when dto.coverImage differs', async () => {
    const { service, deleteByPublicUrl } = build(
      null,
      '/uploads/developers/old-cover.jpg',
    );
    await service.update('d1', {
      coverImage: '/uploads/developers/new-cover.jpg',
    } as unknown as UpdateDeveloperDto);
    expect(deleteByPublicUrl).toHaveBeenCalledWith(
      '/uploads/developers/old-cover.jpg',
      'developers',
    );
  });

  it('cleans up both logo and coverImage when both change', async () => {
    // Lock the interaction: the developers update path holds two
    // upload-managed fields under the same directory; a single PATCH must
    // be able to swap both and have each prior asset cleaned independently.
    const { service, deleteByPublicUrl } = build(
      '/uploads/developers/old-logo.jpg',
      '/uploads/developers/old-cover.jpg',
    );
    await service.update('d1', {
      logo: '/uploads/developers/new-logo.jpg',
      coverImage: '/uploads/developers/new-cover.jpg',
    } as unknown as UpdateDeveloperDto);
    expect(deleteByPublicUrl).toHaveBeenCalledWith(
      '/uploads/developers/old-logo.jpg',
      'developers',
    );
    expect(deleteByPublicUrl).toHaveBeenCalledWith(
      '/uploads/developers/old-cover.jpg',
      'developers',
    );
  });

  it('skips coverImage cleanup when dto.coverImage equals existing', async () => {
    const url = '/uploads/developers/same-cover.jpg';
    const { service, deleteByPublicUrl } = build(null, url);
    await service.update('d1', {
      coverImage: url,
    } as unknown as UpdateDeveloperDto);
    expect(deleteByPublicUrl).not.toHaveBeenCalled();
  });
});

describe('CitiesService.update — PATCH cleanup contract', () => {
  // Build a SiteConfigService stub so the constructor type-checks — the
  // method under test never reaches it.
  const siteConfig = {} as unknown as SiteConfigService;

  const build = (existingImage: string | null) => {
    const { uploads, deleteByPublicUrl } = buildUploadsSpy();
    const prisma = {
      city: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'c1', image: existingImage }),
        update: jest
          .fn()
          .mockImplementation(({ data }: { data: unknown }) =>
            Promise.resolve({ id: 'c1', ...(data as object) }),
          ),
      },
    } as unknown as PrismaService;
    return {
      service: new CitiesService(prisma, uploads, siteConfig),
      deleteByPublicUrl,
    };
  };

  it('deletes the prior image when dto.image differs', async () => {
    const { service, deleteByPublicUrl } = build('/uploads/cities/old.jpg');
    await service.update('c1', {
      image: '/uploads/cities/new.jpg',
    } as unknown as UpdateCityDto);
    expect(deleteByPublicUrl).toHaveBeenCalledWith(
      '/uploads/cities/old.jpg',
      'cities',
    );
  });

  it('skips cleanup when prior image is a seed-baked /images/ path', async () => {
    // Cities seeded without an upload sit on `/images/cities/<slug>.jpg`.
    // The next.image extractStoragePath filter returns null for those, so
    // even if the caller swaps the URL, no spurious delete fires against
    // a key we don't own.
    const { service, deleteByPublicUrl } = build(
      '/images/cities/placeholder.jpg',
    );
    await service.update('c1', {
      image: '/uploads/cities/new.jpg',
    } as unknown as UpdateCityDto);
    // Cleanup is still invoked — but the helper itself no-ops on the
    // mismatched path. Asserting at the deleteByPublicUrl level: it IS
    // called (the service can't tell the URL is seed-baked); the helper
    // contract is what filters. See the extractStoragePath suite above.
    expect(deleteByPublicUrl).toHaveBeenCalledWith(
      '/images/cities/placeholder.jpg',
      'cities',
    );
  });

  it('skips cleanup when dto.image equals existing image', async () => {
    const url = '/uploads/cities/same.jpg';
    const { service, deleteByPublicUrl } = build(url);
    await service.update('c1', {
      image: url,
    } as unknown as UpdateCityDto);
    expect(deleteByPublicUrl).not.toHaveBeenCalled();
  });
});

describe('ArticlesService.update — PATCH cleanup contract', () => {
  const build = (
    existingCover: string | null,
    existingAuthorAvatar: string | null,
  ) => {
    const { uploads, deleteByPublicUrl } = buildUploadsSpy();
    const prisma = {
      article: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'ar1',
          coverImage: existingCover,
          authorAvatar: existingAuthorAvatar,
        }),
        update: jest
          .fn()
          .mockImplementation(({ data }: { data: unknown }) =>
            Promise.resolve({ id: 'ar1', ...(data as object) }),
          ),
      },
    } as unknown as PrismaService;
    return {
      service: new ArticlesService(prisma, uploads),
      deleteByPublicUrl,
    };
  };

  it('cleans up both coverImage and authorAvatar when both change', async () => {
    const { service, deleteByPublicUrl } = build(
      '/uploads/articles/old-cover.jpg',
      '/uploads/articles/old-avatar.jpg',
    );
    await service.update('ar1', {
      coverImage: '/uploads/articles/new-cover.jpg',
      authorAvatar: '/uploads/articles/new-avatar.jpg',
    } as unknown as UpdateArticleDto);
    expect(deleteByPublicUrl).toHaveBeenCalledWith(
      '/uploads/articles/old-cover.jpg',
      'articles',
    );
    expect(deleteByPublicUrl).toHaveBeenCalledWith(
      '/uploads/articles/old-avatar.jpg',
      'articles',
    );
  });

  it('skips both fields when neither is in the body', async () => {
    const { service, deleteByPublicUrl } = build(
      '/uploads/articles/old.jpg',
      '/uploads/articles/avatar.jpg',
    );
    await service.update('ar1', {
      authorName: 'New Author',
    } as unknown as UpdateArticleDto);
    expect(deleteByPublicUrl).not.toHaveBeenCalled();
  });

  it('only cleans up the changed field when one is unchanged', async () => {
    const cover = '/uploads/articles/cover.jpg';
    const oldAvatar = '/uploads/articles/old-avatar.jpg';
    const { service, deleteByPublicUrl } = build(cover, oldAvatar);
    await service.update('ar1', {
      coverImage: cover, // unchanged
      authorAvatar: '/uploads/articles/new-avatar.jpg',
    } as unknown as UpdateArticleDto);
    expect(deleteByPublicUrl).toHaveBeenCalledWith(oldAvatar, 'articles');
    expect(deleteByPublicUrl).not.toHaveBeenCalledWith(cover, 'articles');
  });
});

describe('CoursesService.update — PATCH cleanup contract', () => {
  const progress = {} as unknown as LessonProgressService;

  const build = (existingCover: string | null) => {
    const { uploads, deleteByPublicUrl } = buildUploadsSpy();
    const prisma = {
      course: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'co1', coverImage: existingCover }),
        update: jest
          .fn()
          .mockImplementation(({ data }: { data: unknown }) =>
            Promise.resolve({ id: 'co1', ...(data as object) }),
          ),
      },
    } as unknown as PrismaService;
    return {
      service: new CoursesService(prisma, uploads, progress),
      deleteByPublicUrl,
    };
  };

  it('deletes the prior cover when dto.coverImage differs', async () => {
    const { service, deleteByPublicUrl } = build(
      '/uploads/academy/courses/co1/old.jpg',
    );
    await service.update('co1', {
      coverImage: '/uploads/academy/courses/co1/new.jpg',
    } as unknown as UpdateCourseDto);
    expect(deleteByPublicUrl).toHaveBeenCalledWith(
      '/uploads/academy/courses/co1/old.jpg',
      'academy/courses/co1',
    );
  });

  it('skips cleanup when dto.coverImage is absent', async () => {
    const { service, deleteByPublicUrl } = build(
      '/uploads/academy/courses/co1/old.jpg',
    );
    await service.update('co1', {
      visibility: 'public',
    } as unknown as UpdateCourseDto);
    expect(deleteByPublicUrl).not.toHaveBeenCalled();
  });

  it('skips cleanup when dto.coverImage equals existing cover', async () => {
    const url = '/uploads/academy/courses/co1/same.jpg';
    const { service, deleteByPublicUrl } = build(url);
    await service.update('co1', {
      coverImage: url,
    } as unknown as UpdateCourseDto);
    expect(deleteByPublicUrl).not.toHaveBeenCalled();
  });
});
