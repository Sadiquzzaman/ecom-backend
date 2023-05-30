import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as faker from 'faker';
import {
  categories,
  CategoryEntity,
  GetImageFromDir,
} from '@simec/ecom-common';

@Injectable()
export class CategoryFaker {
  constructor(
    @InjectRepository(CategoryEntity)
    private categoryRepository: Repository<CategoryEntity>,
  ) {}

  private images: string[] = ['/assets/images/shop-1620542959494.jpeg'];
  init = async () => {
    // console.log(JSON.stringify(categories, null, 2));
    for (let x = 0; x < categories.length; x++) {
      try {
        const category = new CategoryEntity();
        category.name = categories[x].name;
        category.description = faker.lorem.paragraph();
        category.position = faker.datatype.number({
          min: 0,
          max: 100,
        });
        category.isRootCategory = 1;
        category.image = categories[x].image;
        // this.images[Math.floor(Math.random() * 100000) % this.images.length];
        category.createAt = new Date();
        category.updatedAt = new Date();
        // console.log({ PCat: category });
        const created = this.categoryRepository.create(category);
        await this.categoryRepository.save(created);
        for (let j = 0; j < categories[x].subcategories.length; j++) {
          await this.createChild(created, x, categories[x].subcategories[j]);
        }
      } catch (error) {
        console.log({ error, PCatJson: categories[x] });
      }
    }
  };

  createChild = async (
    parentEntity: CategoryEntity,
    x: number,
    subCategory: { name: string; image: string },
  ) => {
    try {
      const category = new CategoryEntity();
      category.parent = parentEntity;

      category.name = subCategory.name;
      category.description = faker.lorem.paragraph();
      category.position = faker.datatype.number({
        min: 0,
        max: 100,
      });

      category.isRootCategory = 0;
      category.image = subCategory.image;
      // this.images[
      //   Math.floor(Math.random() * 100000 * this.images.length) %
      //     this.images.length
      // ];

      category.createAt = new Date();
      category.updatedAt = new Date();
      // console.log({ subCat: category });

      const created = this.categoryRepository.create(category);
      await this.categoryRepository.save(created);
    } catch (error) {
      console.log({ error, subCat: subCategory });
    }
    return true;
  };

  findJobCategories = async (): Promise<CategoryEntity[]> => {
    return await this.categoryRepository.find();
  };

  count = async () => {
    return this.categoryRepository.count();
  };
}
