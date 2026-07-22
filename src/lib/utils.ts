import {clsx, type ClassValue} from "clsx"
import {twMerge} from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const generateHeadingId = (text: string) => {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '') // remove special characters execpt spaces and hyphens
        .replace(/\s+/g, '-') //Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, ''); // Remove leading/traling hyphens
}

export const readMarkdownFile = async (
    filename: string,
    contentDir: string,
    fallbackTitle: string,
): Promise<string> => {
    if (typeof window !== 'undefined') return `@@@ ${fallbackTitle} \n\n Content loading...`;

    try {
        const fs = await import('fs');
        const path = await import('path');
        const filePath = path.join(
            process.cwd(),
            `src/app/${contentDir}/content`,
            filename
        );

        return fs.readFileSync(filePath, 'utf-8')

    } catch (e) {
        console.error(
            `Error reading ${fallbackTitle.toLowerCase()} file ${filename}`,
            e
        );

        return `@@@ ${fallbackTitle} \n\n Error loading content for this versions.`
    }
}
