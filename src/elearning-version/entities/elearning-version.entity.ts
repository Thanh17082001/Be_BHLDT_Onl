import { BaseWithCreatedBy } from "src/common/entities/base-user-createdBy";
import { Elearning } from "src/elearning/entities/elearning.entity";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

@Entity()
export class ElearningVersion extends BaseWithCreatedBy {
    @Column()
    content: string;

    @ManyToOne(() => Elearning, (elearning) => elearning.elearningversions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'elearningId' })
    elearning: Elearning;
}
