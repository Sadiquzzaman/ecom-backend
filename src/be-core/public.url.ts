import { RequestMethod } from '@nestjs/common';

export const publicUrls = [
  { path: '/api/static-page/page/:page', method: RequestMethod.GET },
  { path: '/api/states/service-covered', method: RequestMethod.GET },
  { path: '/api/static-page/terms', method: RequestMethod.GET },
  { path: '/api/static-page/privacy', method: RequestMethod.GET },
  { path: '/api/static-page/about', method: RequestMethod.GET },
  { path: '/api/contact-us', method: RequestMethod.POST },
  { path: '/api/static-page/return', method: RequestMethod.GET },
  { path: '/api/countries', method: RequestMethod.GET },
  { path: '/api/states', method: RequestMethod.GET },
  { path: '/api/districts', method: RequestMethod.GET },
  { path: '/api/thanas', method: RequestMethod.GET },
  { path: '/api/states/find/country/:id', method: RequestMethod.GET },
  { path: '/api/districts/find/state/:id', method: RequestMethod.GET },
  { path: '/api/thanas/find/district/:id', method: RequestMethod.GET },
  { path: '/api/residentialAreas/find/thana/:id', method: RequestMethod.GET },
];
