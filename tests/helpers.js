const createSelect = (options = null) => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let select = document.createElement('select');
    select.id = 'test-select';
    
    const defaultOptions = [
        { value: '', text: 'Select an option' },
        { value: 'option1', text: 'Option 1' },
        { value: 'option2', text: 'Option 2' },
        { value: 'option3', text: 'Option 3', disabled: true },
        { value: 'option4', text: 'Option 4' }
    ];
    
    const optionsToUse = options ?? defaultOptions;
    
    optionsToUse.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        if (opt.disabled) option.disabled = true;
        if (opt.selected) option.selected = true;
        select.appendChild(option);
    });
    
    container.appendChild(select);
    return select;
};

const createLabel = (text, htmlFor) => {
    const label = document.createElement('label');
    label.textContent = text;
    label.htmlFor = htmlFor;
    return label;
};

export { createSelect, createLabel };