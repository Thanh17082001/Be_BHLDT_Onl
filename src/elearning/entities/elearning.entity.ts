import { BaseWithCreatedBy } from "src/common/entities/base-user-createdBy";
import { ElearningVersion } from "src/elearning-version/entities/elearning-version.entity";
import { ForumComment } from "src/forum-comment/entities/forum-comment.entity";
import { School } from "src/schools/entities/school.entity";
import { Subject } from "src/subjects/entities/subject.entity";
import { Topic } from "src/topics/entities/topic.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
@Entity()
export class Elearning extends BaseWithCreatedBy {
    // @Column()
    // content: string;
    @Column()
    title: string;

    @ManyToOne(() => School, { nullable: true })
    @JoinColumn({ name: "schoolId" })
    school?: School = null;

    @ManyToOne(() => Subject, { nullable: true })
    @JoinColumn({ name: "subjectId" })
    subject?: Topic = null; @ManyToOne(() => School, { nullable: true })

    @Column({ nullable: true })
    topic?: number = null;

    // @Column({ nullable: true })
    // draftGroupId?: number;
    @Column({ nullable: true })
    currentversion: number;
    
    @OneToMany(() => ElearningVersion, (version) => version.elearning, { cascade: true })
    elearningversions?: ElearningVersion[];

    @OneToMany(() => ForumComment, (comment) => comment.elearning)
    comments: ForumComment[];
}
