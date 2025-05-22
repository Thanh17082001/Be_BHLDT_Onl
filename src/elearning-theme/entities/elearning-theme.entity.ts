import { BaseWithCreatedBy } from "src/common/entities/base-user-createdBy";
import { School } from "src/schools/entities/school.entity";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

@Entity()
export class ElearningTheme extends BaseWithCreatedBy {
    @Column()
    content: string;
    @Column()
    title: string;
    @Column({
        nullable: true
    })
    @Column({ nullable: true })
    path: string = null;
    @ManyToOne(() => School, { nullable: true })
    @JoinColumn({ name: "schoolId" })
    school?: School = null;
}
