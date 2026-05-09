package com.gmail.clone.dto;

import lombok.Data;
import java.util.List;

@Data
public class BulkActionRequest {
    private List<Long> emailIds;
    private String action; // DELETE, ARCHIVE, READ, UNREAD, or custom label
}
