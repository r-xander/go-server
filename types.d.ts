declare class SortablePlugin {}
declare class AutoScrollPlugin {}
declare class OnSpillPlugin {}
declare class MultiDragPlugin {}
declare class SwapPlugin {}

export interface AutoScrollOptions {
    /**
     *  Enable the plugin. Can be `HTMLElement`.
     */
    scroll?: boolean | HTMLElement | undefined;
    /**
     * force the autoscroll fallback to kick in
     */
    forceAutoScrollFallback?: boolean | undefined;
    /**
     * if you have custom scrollbar scrollFn may be used for autoscrolling.
     */
    scrollFn?:
        | ((
              this: Sortable,
              offsetX: number,
              offsetY: number,
              originalEvent: Event,
              touchEvt: TouchEvent,
              hoverTargetEl: HTMLElement
              // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
          ) => "continue" | void)
        | undefined;
    /**
     * `px`, how near the mouse must be to an edge to start scrolling.
     */
    scrollSensitivity?: number | undefined;
    /**
     * `px`, speed of the scrolling.`
     */
    scrollSpeed?: number | undefined;
    /**
     * apply autoscroll to all parent elements, allowing for easier movement.
     */
    bubbleScroll?: boolean | undefined;
}
export interface OnSpillOptions {
    /**
     * This plugin, when enabled,
     * will cause the dragged item to be reverted to it's original position if it is *spilled*
     * (ie. it is dropped outside of a valid Sortable drop target)
     */
    revertOnSpill?: boolean | undefined;
    /**
     * This plugin, when enabled,
     * will cause the dragged item to be removed from the DOM if it is *spilled*
     * (ie. it is dropped outside of a valid Sortable drop target)
     */
    removeOnSpill?: boolean | undefined;
    /**
     * Called when either `revertOnSpill` or `RemoveOnSpill` plugins are enabled.
     */
    onSpill?: ((evt: SortableEvent) => void) | undefined;
}
export interface MultiDragOptions {
    /**
     * Enable the plugin
     */
    multiDrag?: boolean | undefined;
    /**
     * Class name for selected item
     */
    selectedClass?: string | undefined;
    /**
     * The key that must be down for multiple items to be selected.
     * The default is null, meaning no key must be down.
     * For special keys, such as the CTRL key,
     * simply specify the option as 'CTRL' (casing does not matter).
     */
    multiDragKey?: null | undefined | string;

    /**
     * If you don't want to deselect items on outside click
     */
    avoidImplicitDeselect?: boolean | undefined;

    /**
     * Called when an item is selected
     */
    onSelect?: ((event: SortableEvent) => void) | undefined;

    /**
     * Called when an item is deselected
     */
    onDeselect?: ((event: SortableEvent) => void) | undefined;
}

export interface SwapOptions {
    /**
     * Enable swap mode
     */
    swap?: boolean | undefined;
    /**
     * Class name for swap item (if swap mode is enabled)
     */
    swapClass?: string | undefined;
}

export declare class Sortable {
    public options: Sortable.Options;
    public el: HTMLElement;

    /**
     * Sortable's main constructor.
     * @param element Any variety of HTMLElement.
     * @param options Sortable options object.
     */
    constructor(element: HTMLElement, options: Sortable.Options);

    static active: Sortable | null;
    static utils: Sortable.Utils;

    /**
     * Mounts a plugin to Sortable
     * @param sortablePlugin a sortable plugin.
     *
     * @example
     *
     * Sortable.mount(new MultiDrag(), new AutoScroll())
     */
    static mount(...sortablePlugins: SortablePlugin[]): void;

    /**
     * Creation of new instances.
     * @param element Any variety of HTMLElement.
     * @param options Sortable options object.
     */
    static create(element: HTMLElement, options?: Sortable.Options): Sortable;

    /** The element being dragged. */
    static dragged: HTMLElement | null;

    /** The ghost element.*/
    static ghost: HTMLElement | null;

    /** The clone element. */
    static clone: HTMLElement | null;

    /** Get the Sortable instance on an element. */
    static get(element: HTMLElement): Sortable | undefined;

    /** Get the Sortable version */
    static readonly version: string;

    /**
     * Options getter/setter
     * @param name a Sortable.Options property.
     * @param value a value.
     */
    option<K extends keyof Sortable.Options>(name: K, value: Sortable.Options[K]): void;
    option<K extends keyof Sortable.Options>(name: K): Sortable.Options[K];

    /**
     * For each element in the set, get the first element that matches the selector by testing the element itself and traversing up through its ancestors in the DOM tree.
     * @param element an HTMLElement or selector string.
     * @param selector default: `options.draggable`
     */
    closest(element: HTMLElement, selector?: string): HTMLElement | null;

    /**
     * Sorts the elements according to the array.
     * @param order an array of strings to sort.
     * @param useAnimation default: false.
     */
    sort(order: readonly string[], useAnimation?: boolean): void;

    /**
     * Saving and restoring of the sort.
     */
    save(): void;

    /**
     * Removes the sortable functionality completely.
     */
    destroy(): void;

    /**
     * Serializes the sortable's item data-id's (dataIdAttr option) into an array of string.
     */
    toArray(): string[];
}

declare namespace Sortable {
    export interface Options
        extends SortableOptions,
            AutoScrollOptions,
            MultiDragOptions,
            OnSpillOptions,
            SwapOptions {}

    /**
     * A class that all plugins inherit from for the sake of type inference.
     */
    export class Plugin extends SortablePlugin {}
    export class MultiDrag extends MultiDragPlugin {}
    export class AutoScroll extends AutoScrollPlugin {}
    export class Swap extends SwapPlugin {}
    export class OnSpill extends OnSpillPlugin {}

    export interface SortableEvent extends Event {
        clone: HTMLElement;
        /**
         * previous list
         */
        from: HTMLElement;
        /**
         * dragged element
         */
        item: HTMLElement;
        /**
         * dragged elements
         */
        items: HTMLElement[];
        /**
         * new index within parent
         */
        newIndex: number | undefined;
        /**
         * old index within parent
         */
        oldIndex: number | undefined;
        /**
         * the original event 
         */
        originalEvent: DragEvent;
        target: HTMLElement;
        /**
         * list, in which moved element.
         */
        to: HTMLElement;
        /**
         * Old index within parent, only counting draggable elements
         */
        oldDraggableIndex: number | undefined;
        /**
         * New index within parent, only counting draggable elements
         */
        newDraggableIndex: number | undefined;
        /**
         * Pull mode if dragging into another sortable
         */
        pullMode: "clone" | boolean | undefined;
        /**
         * When MultiDrag is used to sort, this holds a HTMLElement and oldIndex for each item selected.
         *
         * `oldIndicies[number]` is directly related to `newIndicies[number]`
         *
         * If MultiDrag is not used to sort, this array will be empty.
         */
        oldIndicies: Array<{ multiDragElement: HTMLElement; index: number }>;
        /**
         * When MultiDrag is used to sort, this holds a HTMLElement and newIndex for each item.
         *
         * `oldIndicies[number]` is directly related to `newIndicies[number]`
         *
         * If MultiDrag is not used to sort, this array will be empty.
         */
        newIndicies: Array<{ multiDragElement: HTMLElement; index: number }>;
        /** When Swap is used to sort, this will contain the dragging item that was dropped on.*/
        swapItem: HTMLElement | null;
    }

    export interface MoveEvent extends Event {
        dragged: HTMLElement;
        draggedRect: DOMRect;
        from: HTMLElement;
        /**
         * element on which have guided
         */
        related: HTMLElement;
        relatedRect: DOMRect;
        to: HTMLElement;
        willInsertAfter?: boolean | undefined;
    }

    type PullResult = readonly string[] | boolean | "clone";
    type PutResult = readonly string[] | boolean;
    export interface GroupOptions {
        /**
         * group name
         */
        name: string;
        /**
         * ability to move from the list. clone — copy the item, rather than move.
         */
        pull?:
            | PullResult
            | ((to: Sortable, from: Sortable, dragEl: HTMLElement, event: SortableEvent) => PullResult)
            | undefined;
        /**
         * whether elements can be added from other lists, or an array of group names from which elements can be taken.
         */
        put?:
            | PutResult
            | ((to: Sortable, from: Sortable, dragEl: HTMLElement, event: SortableEvent) => PutResult)
            | undefined;
        /**
         * a canonical version of pull, created by Sortable
         */
        checkPull?:
            | ((
                  sortable: Sortable,
                  activeSortable: Sortable,
                  dragEl: HTMLElement,
                  event: SortableEvent
              ) => boolean | string | string[])
            | undefined;
        /**
         * a canonical version of put, created by Sortable
         */
        checkPut?:
            | ((
                  sortable: Sortable,
                  activeSortable: Sortable,
                  dragEl: HTMLElement,
                  event: SortableEvent
              ) => boolean | string | "clone" | string[])
            | undefined;
        /**
         * revert cloned element to initial position after moving to a another list.
         */
        revertClone?: boolean | undefined;
    }
    type Direction = "vertical" | "horizontal";
    export interface SortableOptions {
        /**
         * ms, animation speed moving items when sorting, `0` — without animation
         */
        animation?: number | undefined;
        /**
         * Class name for the chosen item
         */
        chosenClass?: string | undefined;
        dataIdAttr?: string | undefined;
        /**
         * time in milliseconds to define when the sorting should start
         */
        delay?: number | undefined;
        /**
         * Only delay if user is using touch
         */
        delayOnTouchOnly?: boolean | undefined;
        /**
         * Direction of Sortable
         * (will be detected automatically if not given)
         */
        direction?:
            | ((evt: SortableEvent, target: HTMLElement, dragEl: HTMLElement) => Direction)
            | Direction
            | undefined;
        /**
         * Disables the sortable if set to true.
         */
        disabled?: boolean | undefined;
        /**
         * Class name for the dragging item
         */
        dragClass?: string | undefined;
        /**
         * Specifies which items inside the element should be draggable
         */
        draggable?: string | undefined;
        dragoverBubble?: boolean | undefined;
        dropBubble?: boolean | undefined;
        /**
         * distance mouse must be from empty sortable
         * to insert drag element into it
         */
        emptyInsertThreshold?: number | undefined;

        /**
         * Easing for animation. Defaults to null.
         *
         * See https://easings.net/ for examples.
         *
         * For other possible values, see
         * https://www.w3schools.com/cssref/css3_pr_animation-timing-function.asp
         *
         * @example
         *
         * // CSS functions
         * | 'steps(int, start | end)'
         * | 'cubic-bezier(n, n, n, n)'
         *
         * // CSS values
         * | 'linear'
         * | 'ease'
         * | 'ease-in'
         * | 'ease-out'
         * | 'ease-in-out'
         * | 'step-start'
         * | 'step-end'
         * | 'initial'
         * | 'inherit'
         */
        easing?: string | undefined;
        /**
         * Class name for the cloned DOM Element when using forceFallback
         */
        fallbackClass?: string | undefined;
        /**
         * Appends the cloned DOM Element into the Document's Body
         */
        fallbackOnBody?: boolean | undefined;
        /**
         * Specify in pixels how far the mouse should move before it's considered as a drag.
         */
        fallbackTolerance?: number | undefined;
        fallbackOffset?: { x: number; y: number } | undefined;
        /**
         * Selectors that do not lead to dragging (String or Function)
         */
        filter?:
            | string
            | ((this: Sortable, event: Event | TouchEvent, target: HTMLElement, sortable: Sortable) => boolean)
            | undefined;
        /**
         * ignore the HTML5 DnD behaviour and force the fallback to kick in
         */
        forceFallback?: boolean | undefined;
        /**
         * Class name for the drop placeholder
         */
        ghostClass?: string | undefined;
        /**
         * To drag elements from one list into another, both lists must have the same group value.
         * You can also define whether lists can give away, give and keep a copy (clone), and receive elements.
         */
        group?: string | GroupOptions | undefined;
        /**
         * Drag handle selector within list items
         */
        handle?: string | undefined;
        ignore?: string | undefined;
        /**
         * Will always use inverted swap zone if set to true
         */
        invertSwap?: boolean | undefined;
        /**
         * Threshold of the inverted swap zone
         * (will be set to `swapThreshold` value by default)
         */
        invertedSwapThreshold?: number | undefined;
        /**
         * Call `event.preventDefault()` when triggered `filter`
         */
        preventOnFilter?: boolean | undefined;
        /**
         * Remove the clone element when it is not showing,
         * rather than just hiding it
         */
        removeCloneOnHide?: boolean | undefined;
        /**
         * sorting inside list
         */
        sort?: boolean | undefined;
        store?:
            | {
                  get: (sortable: Sortable) => string[];
                  set: (sortable: Sortable) => void;
              }
            | undefined;
        /**
         * support pointer events
         */
        supportPointer?: boolean | undefined;
        /**
         * Threshold of the swap zone.
         * Defaults to `1`
         */
        swapThreshold?: number | undefined;
        /**
         * How many *pixels* the point should move before cancelling a delayed drag event
         */
        touchStartThreshold?: number | undefined;

        setData?: ((dataTransfer: DataTransfer, draggedElement: HTMLElement) => void) | undefined;
        /**
         * Element dragging started
         */
        onStart?: ((event: SortableEvent) => void) | undefined;
        /**
         * Element dragging ended
         */
        onEnd?: ((event: SortableEvent) => void) | undefined;
        /**
         * Element is dropped into the list from another list
         */
        onAdd?: ((event: SortableEvent) => void) | undefined;
        /**
         * Created a clone of an element
         */
        onClone?: ((event: SortableEvent) => void) | undefined;
        /**
         * Element is chosen
         */
        onChoose?: ((event: SortableEvent) => void) | undefined;
        /**
         * Element is unchosen
         */
        onUnchoose?: ((event: SortableEvent) => void) | undefined;
        /**
         * Changed sorting within list
         */
        onUpdate?: ((event: SortableEvent) => void) | undefined;
        /**
         * Called by any change to the list (add / update / remove)
         */
        onSort?: ((event: SortableEvent) => void) | undefined;
        /**
         * Element is removed from the list into another list
         */
        onRemove?: ((event: SortableEvent) => void) | undefined;
        /**
         * Attempt to drag a filtered element
         */
        onFilter?: ((event: SortableEvent) => void) | undefined;
        /**
         * Event when you move an item in the list or between lists
         */
        // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
        onMove?: ((evt: MoveEvent, originalEvent: Event) => boolean | -1 | 1 | void) | undefined;
        /**
         * Called when dragging element changes position
         */
        onChange?: ((evt: SortableEvent) => void) | undefined;
    }

    interface Utils {
        /**
         * Attach an event handler function
         * @param element an HTMLElement.
         * @param event an Event context.
         * @param fn
         */
        on(element: HTMLElement, event: string, fn: EventListenerOrEventListenerObject): void;

        /**
         * Remove an event handler function
         * @param element an HTMLElement.
         * @param event an Event context.
         * @param fn a callback.
         */
        off(element: HTMLElement, event: string, fn: EventListenerOrEventListenerObject): void;

        /**
         * Get the values of all the CSS properties.
         * @param element an HTMLElement.
         */
        css(element: HTMLElement): CSSStyleDeclaration;

        /**
         * Get the value of style properties.
         * @param element an HTMLElement.
         * @param prop a property key.
         */
        css<K extends keyof CSSStyleDeclaration>(element: HTMLElement, prop: K): CSSStyleDeclaration[K];

        /**
         * Set one CSS property.
         * @param element an HTMLElement.
         * @param prop a property key.
         * @param value a property value.
         */
        css<K extends keyof CSSStyleDeclaration>(element: HTMLElement, prop: K, value: CSSStyleDeclaration[K]): void;

        /**
         * Get elements by tag name.
         * @param context an HTMLElement.
         * @param tagName A tag name.
         * @param iterator An iterator.
         */
        find(
            context: HTMLElement,
            tagName: string,
            iterator?: (value: HTMLElement, index: number) => void
        ): NodeListOf<HTMLElement>;

        /**
         * Check the current matched set of elements against a selector.
         * @param element an HTMLElement.
         * @param selector an element selector.
         */
        is(element: HTMLElement, selector: string): boolean;

        /**
         * For each element in the set, get the first element that matches the selector by testing the element itself and traversing up through its ancestors in the DOM tree.
         * @param element an HTMLElement.
         * @param selector an element seletor.
         * @param context a specific element's context.
         */
        closest(element: HTMLElement, selector: string, context?: HTMLElement): HTMLElement | null;

        /**
         * Add or remove one classes from each element
         * @param element an HTMLElement.
         * @param name a class name.
         * @param state a class's state.
         */
        toggleClass(element: HTMLElement, name: string, state: boolean): void;

        /**
         * Selects the provided multi-drag item
         * @param element The element to be selected
         */
        select(element: HTMLElement): void;

        /**
         * Deselects the provided multi-drag item
         * @param element The element to be deselected
         */
        deselect(element: HTMLElement): void;
    }

    interface DOMRect {
        bottom: number;
        height: number;
        left: number;
        right: number;
        top: number;
        width: number;
        x: number;
        y: number;
    }
}

type FormFieldBaseAttributes = {
    id: string;
    type: string;
    name: string;
    label?: string;
    includeLabel: boolean;
    description?: string;
    defaultValue?: string;
    layout: "inline" | "block";
    required: boolean;
    readonly: boolean;
    disabled: boolean;
    hidden: boolean;
}

type TextFormFieldAttributes = FormFieldBaseAttributes & {
    placeholder?: string?;
    max: number;
    min: number;
};

type NumberInputAttributes = FormFieldBaseAttributes & {
    placeholder: string;
    max: number;
    min: number;
    step: number;
};
