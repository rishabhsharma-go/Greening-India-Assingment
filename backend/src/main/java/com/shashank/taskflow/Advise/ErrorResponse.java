package com.shashank.taskflow.Advise;

import lombok.Getter;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
public class ErrorResponse {
    private String error;
    private Map<String, String> fields; // only for validation errors
    private String message; // optional for other errors

    public ErrorResponse(String error) {
        this.error = error;
    }

    public ErrorResponse(String error, String message) {
        this.error = error;
        this.message = message;
    }

    public ErrorResponse(String error, Map<String, String> fields) {
        this.error = error;
        this.fields = fields;
    }
}
