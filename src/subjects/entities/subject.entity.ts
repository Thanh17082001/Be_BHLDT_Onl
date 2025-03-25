
import { BaseWithCreatedBy } from "src/common/entities/base-user-createdBy";
import { AbstractEntity } from "src/common/entities/base.entity";
import { Grade } from "src/grade/entities/grade.entity";
import { User } from "src/users/entities/user.entity";
import { Column, Entity, Index, ManyToMany, ManyToOne, OneToMany } from "typeorm";

@Entity()

export class Subject extends BaseWithCreatedBy {
    @Column()
    name: string; // VD: "Toán", "Văn"

    // Một môn học thuộc một khối
    @ManyToOne(() => Grade, (grade) => grade.subjects, { onDelete: 'SET NULL' })
    grade: Grade;

    // Một môn học có thể có nhiều user
    @ManyToMany(() => User, (user) => user.subjects)
    users: User[]
}

