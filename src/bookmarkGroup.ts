import * as vscode from 'vscode';
import { Bookmark } from './bookmark';

/**
 * Represents a group of bookmarks
 */
export class BookmarkGroup {
    /**
     * Unique ID for the group
     */
    id: string;
    
    /**
     * Name of the group
     */
    name: string;
    
    /**
     * Optional description for the group
     */
    description: string;
    
    /**
     * Bookmarks contained in this group
     */
    bookmarks: Bookmark[];
    
    /**
     * Child groups (for nested groups)
     */
    groups: BookmarkGroup[];
    
    /**
     * Parent group (if this is a nested group)
     */
    parent?: BookmarkGroup;
    
    /**
     * Date when the group was created
     */
    createdAt: Date;
    
    /**
     * Creates a new bookmark group
     * 
     * @param name Name of the group
     * @param description Optional description for the group
     * @param parent Optional parent group
     */
    constructor(name: string, description?: string, parent?: BookmarkGroup) {
        this.id = `group-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        this.name = name;
        this.description = description || '';
        this.bookmarks = [];
        this.groups = [];
        this.parent = parent;
        this.createdAt = new Date();
    }
    
    /**
     * Adds a bookmark to the group
     * 
     * @param bookmark Bookmark to add
     */
    addBookmark(bookmark: Bookmark): void {
        if (!this.bookmarks.some(b => b.id === bookmark.id)) {
            this.bookmarks.push(bookmark);
        }
    }
    
    /**
     * Removes a bookmark from the group
     * 
     * @param id ID of the bookmark to remove
     * @returns true if the bookmark was removed, false otherwise
     */
    removeBookmark(id: string): boolean {
        const initialLength = this.bookmarks.length;
        this.bookmarks = this.bookmarks.filter(b => b.id !== id);
        return initialLength !== this.bookmarks.length;
    }
    
    /**
     * Adds a child group to this group
     * 
     * @param group Group to add as a child
     */
    addGroup(group: BookmarkGroup): void {
        if (!this.groups.some(g => g.id === group.id)) {
            group.parent = this;
            this.groups.push(group);
        }
    }
    
    /**
     * Removes a child group from this group
     * 
     * @param id ID of the group to remove
     * @returns true if the group was removed, false otherwise
     */
    removeGroup(id: string): boolean {
        const initialLength = this.groups.length;
        this.groups = this.groups.filter(g => g.id !== id);
        return initialLength !== this.groups.length;
    }
    
    /**
     * Opens all bookmarks in the group
     */
    async openAll(): Promise<void> {
        for (const bookmark of this.bookmarks) {
            await bookmark.open();
        }
    }
    
    /**
     * Closes all bookmarks in the group
     */
    async closeAll(): Promise<void> {
        for (const bookmark of this.bookmarks) {
            try {
                const tabsToClose = vscode.window.tabGroups.all
                    .flatMap(group => group.tabs)
                    .filter(tab => tab.input instanceof vscode.TabInputText && 
                        tab.input.uri.fsPath === bookmark.uri.fsPath);
                
                for (const tab of tabsToClose) {
                    await vscode.window.tabGroups.close(tab);
                }
            } catch (error: unknown) {
                console.error(`Error closing bookmark ${bookmark.name}:`, error);
            }
        }
    }
    
    /**
     * Checks if the group is empty (no bookmarks and no child groups)
     */
    isEmpty(): boolean {
        return this.bookmarks.length === 0 && this.groups.length === 0;
    }
    
    /**
     * Gets all bookmarks in this group and all child groups
     */
    getAllBookmarks(): Bookmark[] {
        let allBookmarks = [...this.bookmarks];
        
        for (const group of this.groups) {
            allBookmarks = allBookmarks.concat(group.getAllBookmarks());
        }
        
        return allBookmarks;
    }
    
    /**
     * Converts the group to a JSON object for serialization
     */
    toJSON(): any {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            bookmarks: this.bookmarks.map(b => b.toJSON()),
            groups: this.groups.map(g => g.toJSON()),
            createdAt: this.createdAt.toISOString()
        };
    }
    
    /**
     * Creates a group from a serialized JSON object
     * 
     * @param data Serialized group data
     * @returns A new BookmarkGroup instance
     */
    static fromJSON(data: any): BookmarkGroup {
        const group = new BookmarkGroup(data.name, data.description);
        
        group.id = data.id;
        group.createdAt = new Date(data.createdAt);
        
        // Deserialize bookmarks
        group.bookmarks = data.bookmarks.map((bookmarkData: any) => 
            Bookmark.fromJSON(bookmarkData)
        );
        
        // Deserialize child groups
        group.groups = data.groups.map((groupData: any) => {
            const childGroup = BookmarkGroup.fromJSON(groupData);
            childGroup.parent = group;
            return childGroup;
        });
        
        return group;
    }
}
