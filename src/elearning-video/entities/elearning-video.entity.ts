import { BaseWithCreatedBy } from "src/common/entities/base-user-createdBy";
import { Elearning } from "src/elearning/entities/elearning.entity";
import { School } from "src/schools/entities/school.entity";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

@Entity()
export class ElearningVideo extends BaseWithCreatedBy {
    @Column({default:''})
    name: string;
    @Column({
        nullable: true
    })
    path: string;
    @ManyToOne(() => Elearning, { nullable: true })
    @JoinColumn({ name: "elearning_id" })
    elearning: Elearning;
    @Column({
        nullable: true
    })
    page: number;

    @Column({
        nullable: true
    })
    minetype: string;

    @ManyToOne(() => School, { nullable: true })
        @JoinColumn({ name: "schoolId" })
        school?: School = null;
}
