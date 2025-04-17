import * as fs from 'fs';
import * as path from 'path';

interface FileFolderList {
    files: string[];
    folders: string[];
}

export interface ZipEntryDto {
    name: string;
    path: string;
    isDirectory: boolean;
    parentPath?: string; // dùng để tạo parent-child nếu cần
}


interface File {
    name: string;
    isFolder: boolean;
    files?: File[];  // Chỉ có khi là thư mục
}

interface FileType {
    name: string;
    children: File[];
}

interface Topic {
    name: string;
    fileTypes: FileType[];  // Thêm fileTypes vào Topic
}

interface Subject {
    name: string;
    topics: Topic[];  // Mỗi môn học sẽ có các chủ đề
}


export function parseZipToObject2(entries: ZipEntryDto[]) {
    const result = {
        name: '',
        subjects: [],
    };

    const pathMap = new Map<string, ZipEntryDto[]>();

    // Sắp xếp các entry theo path của chúng
    for (const entry of entries) {
        if (!pathMap.has(entry.parentPath)) {
            pathMap.set(entry.parentPath, []);
        }
        pathMap.get(entry.parentPath)?.push(entry);
    }

    // Duyệt qua tất cả các entry để phân loại theo cấu trúc lớp - môn - chủ đề - loại tài liệu
    for (const entry of entries) {
        const parts = entry.path.split('/').filter(Boolean);

        // Bỏ qua những entry không đúng định dạng
        if (parts.length < 4) continue;

        const [className, subjectName, topicName, fileTypeName, ...rest] = parts;

        // Gán tên lớp nếu chưa có
        if (!result.name) result.name = className;

        // Tìm hoặc tạo subject
        let subject = result.subjects.find(s => s.name === subjectName);
        if (!subject) {
            subject = {
                name: subjectName,
                topics: [],
            };
            result.subjects.push(subject);
        }

        // Tìm hoặc tạo topic
        let topic = subject.topics.find(t => t.name === topicName);
        if (!topic) {
            topic = {
                name: topicName,
                fileTypes: [],
            };
            subject.topics.push(topic);
        }

        // Tìm hoặc tạo fileType trong topic
        let fileType = topic.fileTypes.find(ft => ft.name === fileTypeName);
        if (!fileType) {
            fileType = {
                name: fileTypeName,
                children: [],
            };
            topic.fileTypes.push(fileType);
        }

        // Kiểm tra thư mục "Tài liệu tham khảo" và xử lý các file bên trong
        if (entry.isDirectory && entry.name === 'Tài liệu tham khảo') {
            const children = pathMap.get(entry.path) || [];
            fileType.children.push({
                name: entry.name,
                isFolder: true,
                files: children.map(child => ({
                    name: child.name,
                    isFolder: child.isDirectory,
                })),
            });
        } else if (parts.length === 5 && entry.parentPath.endsWith(`/${fileTypeName}/`)) {
            // Xử lý thư mục và các tài liệu con bên trong fileType
            if (entry.isDirectory) {
                const children = pathMap.get(entry.path) || [];
                fileType.children.push({
                    name: entry.name,
                    isFolder: true,
                    files: children.map(child => ({
                        name: child.name,
                        isFolder: child.isDirectory,
                    })),
                });
            } else {
                fileType.children.push({
                    name: entry.name,
                    isFolder: false,
                });
            }
        } else if (parts.length > 5) {
            // Nếu có thêm thư mục con, xử lý file con
            fileType.children.push({
                name: entry.name,
                isFolder: false,
            });
        }
    }

    return result;
}


