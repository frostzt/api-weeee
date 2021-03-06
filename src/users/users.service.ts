import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateUserInput } from './inputs/create-user.input';
import { User } from './entities/users.entity';
import * as bcrypt from 'bcrypt';
import { LoginUserInput } from './inputs/login-user.input';
import { JwtService } from '@nestjs/jwt';
import { UpdateUserInput } from './inputs/update-user.input';
import { Company } from './entities/company.entity';
import { CreateCompanyInput } from './inputs/create-company.input';
import { FullUser } from './users.type';
import { CompanyType } from './company.type';

export interface UserWToken {
  accessToken: string;
  user: User;
}

export interface CompanyWToken {
  accessToken: string;
  company: Company;
}
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: EntityRepository<User>,
    @InjectRepository(Company)
    private companyRepository: EntityRepository<Company>,
    private jwtService: JwtService,
  ) {}

  // Create and register a user
  async createUser(createUserInput: CreateUserInput): Promise<string> {
    const { name, email, age, password, username } = createUserInput;

    // Check if username already exists
    const usernameExists = await this.usersRepository.findOne({ username });
    if (usernameExists) {
      throw new BadRequestException('This username is already taken!');
    }

    const usermailExists = await this.usersRepository.findOne({ email });
    if (usermailExists) {
      throw new BadRequestException('This mail is taken, please sign in!');
    }

    // Get NONE Company
    let noneCompany = await this.companyRepository.findOne({
      email: 'NONE@NONE.com',
    });
    if (!noneCompany) {
      noneCompany = await this.createCompany({
        name: 'NONE',
        email: 'NONE@NONE.com',
        password: '.E*4UJzhQ-d(Ff@',
      });
    }

    // Hash the password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = this.usersRepository.create({
      id: uuidv4(),
      username,
      password: hashedPassword,
      name,
      email,
      age,
      picture: 'cat',
      companyOrOrganization: noneCompany.id,
    });

    await this.usersRepository.persistAndFlush(user);
    return 'success';
  }

  // Register a company and create a company account
  async createCompany(
    createCompanyInput: CreateCompanyInput,
  ): Promise<Company> {
    const { name, email, password } = createCompanyInput;

    // Check if the company account already exists
    const emailExists = await this.companyRepository.findOne({ email });
    if (emailExists) {
      throw new BadRequestException(
        'This company is already registered. Please contact your account manager.',
      );
    }

    // Hash the password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const company = this.companyRepository.create({
      id: uuidv4(),
      name,
      email,
      password: hashedPassword,
    });

    await this.companyRepository.persistAndFlush(company);
    return company;
  }

  // Get all companies
  async getAllCompanies(): Promise<Company[]> {
    return this.companyRepository.findAll();
  }

  // Get and return a user using the Bearer Token
  async getUser(user: User): Promise<FullUser> {
    const fullUser = await this.usersRepository.findOne({ email: user.email }, [
      'companyOrOrganization',
    ]);

    return fullUser;
  }

  async getCompany(company: Company): Promise<Company> {
    const fullCompany = await this.companyRepository.findOne({
      email: company.email,
    });

    return fullCompany;
  }

  async getAllEmployees(company: Company) {
    const users = await this.usersRepository.find(
      {
        companyOrOrganization: company.id,
      },
      ['companyOrOrganization'],
    );

    return users;
  }

  // Verify and sign a user in and return the accessToken
  async signIn(
    loginData: LoginUserInput,
    isCompany: boolean,
  ): Promise<UserWToken | CompanyWToken> {
    const { email, password } = loginData;
    const user =
      !isCompany &&
      (await this.usersRepository.findOne({ email }, [
        'companyOrOrganization',
      ]));
    const company =
      isCompany && (await this.companyRepository.findOne({ email }));

    // Find and return user if not company
    if (!isCompany) {
      if (user && (await bcrypt.compare(password, user.password))) {
        const payload = { email };
        const accessToken = this.jwtService.sign(payload);

        return {
          accessToken,
          user,
        };
      } else {
        throw new UnauthorizedException(
          'The password or username is incorrect!',
        );
      }
    }

    // Return company if isCompany
    if (isCompany) {
      if (company && (await bcrypt.compare(password, company.password))) {
        const payload = { email };
        const accessToken = this.jwtService.sign(payload);

        return {
          accessToken,
          company,
        };
      } else {
        throw new UnauthorizedException(
          'The password or username is incorrect!',
        );
      }
    }
  }

  // Update the user on the bases of data provided
  async updateUser<T>(
    updateData: UpdateUserInput,
    instance: T,
  ): Promise<User | Company> {
    if (instance instanceof User) {
      const updatedUser = await this.usersRepository.findOne({
        email: instance.email,
      });

      // Update the user
      const { name, email, age, username, bio, companyOrOrganization } =
        updateData;

      if (name) {
        updatedUser.name = name;
      }

      if (email) {
        updatedUser.email = email;
      }

      if (age) {
        updatedUser.age = parseInt(age);
      }

      if (username) {
        updatedUser.username = username;
      }

      if (bio) {
        updatedUser.bio = bio;
      }

      if (companyOrOrganization) {
        instance.companyOrOrganization = companyOrOrganization;
      }

      await this.usersRepository.persistAndFlush(updatedUser);
      return updatedUser;
    }

    if (instance instanceof Company) {
      const updatedCompany = await this.companyRepository.findOne({
        email: instance.email,
      });

      // Update the company
      const { name, email, bio } = updateData;

      if (name) {
        updatedCompany.name = name;
      }

      if (email) {
        updatedCompany.email = email;
      }

      if (bio) {
        updatedCompany.bio = bio;
      }
    }

    throw new InternalServerErrorException(
      "Something went wrong we're working on it!",
    );
  }
}
