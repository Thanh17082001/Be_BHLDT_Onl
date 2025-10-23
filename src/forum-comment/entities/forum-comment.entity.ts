import { BaseWithCreatedBy } from "src/common/entities/base-user-createdBy";
import { Elearning } from "src/elearning/entities/elearning.entity";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

@Entity()
export class ForumComment extends BaseWithCreatedBy {
    @Column()
    content: string;

    // Bình luận thuộc bài giảng nào
    @ManyToOne(() => Elearning, (elearning) => elearning.comments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'elearningId' })
    elearning: Elearning;
}
