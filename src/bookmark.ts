import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Represents a bookmark for a file in VS Code
 */
export class Bookmark {
    /**
     * Unique ID for the bookmark
     */
    id: string;
    
    /**
     * URI of the bookmarked file
     */
    uri: vscode.Uri;
    
    /**
     * Display name for the bookmark
     */
    name: string;
    
    /**
     * Optional description for the bookmark
     */
    description: string;
    
    /**
     * Date when the bookmark was created
     */
    createdAt: Date;
    
    /**
     * Creates a new bookmark
     * 
     * @param uri URI of the file to bookmark
     * @param name Optional name for the bookmark (defaults to filename)
     * @param description Optional description for the bookmark
     */
    constructor(uri: vscode.Uri, name?: string, description?: string) {
        this.id = `bookmark-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        this.uri = uri;
        this.name = name || path.basename(uri.fsPath);
        this.description = description || '';
        this.createdAt = new Date();
    }
    
    /**
     * Opens the bookmarked file in the editor
     */
    async open(): Promise<vscode.TextEditor | undefined> {
        try {
            const document = await vscode.workspace.openTextDocument(this.uri);
            return await vscode.window.showTextDocument(document);
        } catch (error: unknown) {
            vscode.window.showErrorMessage(`Failed to open bookmark: ${this.name}`);
            console.error("Failed to open bookmark:", error);
            return undefined;
        }
    }
    
    /**
     * Converts the bookmark to a JSON object for serialization
     */
    toJSON(): any {
        return {
            id: this.id,
            uri: this.uri.toString(),
            name: this.name,
            description: this.description,
            createdAt: this.createdAt.toISOString()
        };
    }
    
    /**
     * Creates a bookmark from a serialized JSON object
     * 
     * @param data Serialized bookmark data
     * @returns A new Bookmark instance
     */
    static fromJSON(data: any): Bookmark {
        const bookmark = new Bookmark(
            vscode.Uri.parse(data.uri),
            data.name,
            data.description
        );
        
        bookmark.id = data.id;
        bookmark.createdAt = new Date(data.createdAt);
        
        return bookmark;
    }
}
