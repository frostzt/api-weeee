import { Field, ObjectType, ID } from '@nestjs/graphql';
import { UsersType } from './users.type';

@ObjectType()
export class CompanyType {
  @Field(() => ID)
  id: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field()
  name: string;

  @Field()
  accountType: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  bio?: string;

  @Field()
  picture: string;

  @Field(() => [UsersType])
  users?: string;
}
