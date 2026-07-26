import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { VehicleAccess } from '../vehicle-access/vehicle-access.entity';
import { Review } from '../reviews/review.entity';
import { Product } from '../products/product.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Vehicle, VehicleAccess, Review, Product])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
