package com.gmail.clone.exception;

import java.util.List;

public class DuplicateEmailException extends RuntimeException {

    private final List<String> suggestions;

    public DuplicateEmailException(String message, List<String> suggestions) {
        super(message);
        this.suggestions = suggestions;
    }

    public List<String> getSuggestions() {
        return suggestions;
    }
}
