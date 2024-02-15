type TextInputAttributes = {
    id: string;
    name: string;
    maxLength: number;
    minLength: number;
    pattern: string;
    defaultValue: string;
    placeholder: string;
    required: boolean;
    readonly: boolean;
    disabled: boolean;
};

type NumberInputAttributes = {
    id: string;
    name: string;
    max: number;
    min: number;
    step: number;
    defaultValue: string;
    placeholder: string;
    required: boolean;
    readonly: boolean;
    disabled: boolean;
};
