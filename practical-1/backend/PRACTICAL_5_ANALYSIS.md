# Practical 5: MongoDB & Mongoose Integration - Analysis & Key Questions

## 1. Key Questions & Analysis

### Q1: What is the purpose of a schema in a NoSQL database like MongoDB, given that MongoDB itself is schema-less?
**Answer:**
Although MongoDB is document-oriented and schema-less at the storage engine level (allowing documents in a collection to have varying fields), modern applications require data consistency, structural integrity, and type safety. 
Mongoose introduces a **schema layer at the application level**, enabling developers to:
- Define expected document fields, types, and relationships (`userId` ref `User`).
- Enforce business logic rules (e.g. `required: true`, `enum` constraints).
- Provide default values (e.g. `completed: false`, `createdAt: Date.now`).
- Run pre-save/post-save middleware hooks (e.g. string trimming).

### Q2: Why is it important to define required fields and default values at the schema level rather than relying on frontend validation alone?
**Answer:**
Frontend validation alone is easily bypassed via direct API calls (e.g. Postman, cURL, scripts, or malicious actors). Schema-level enforcement ensures:
- **Data Integrity**: Invalid, empty, or corrupted data is rejected before writing to the database.
- **Single Source of Truth**: All backend clients (mobile app, web app, 3rd party integrations) follow identical rules.
- **Consistency**: Default values ensure consistent state across all saved documents.

### Q3: What happens internally when a document fails Mongoose validation — where is the request stopped?
**Answer:**
When calling `doc.save()` or `Task.create()`, Mongoose runs validation **in-memory within Node.js before sending any query to MongoDB**.
If a field violates schema rules:
1. Mongoose constructs a `ValidationError` object containing details for all failing fields.
2. The execution halts immediately inside the Node.js application process.
3. No network command or write request is sent to the MongoDB server.
4. The promise rejects, triggering the `catch(err)` block or forwarding to Express error-handling middleware (`next(err)`).

---

## 2. Supplementary Features Implemented

1. **Priority Enum**: Added `priority` field to `taskSchema` restricted to `['low', 'medium', 'high']` with a default of `'medium'`.
2. **Pre-Save Hook**: Added a `taskSchema.pre('save')` hook to automatically trim whitespace from the `title` field.
3. **GET /tasks/:id Endpoint**: Returns a single task document or a structured `404` JSON response if the task ID is invalid or missing.
4. **Clean JSON Validation Error Responses**: Custom global error handler transforms Mongoose `ValidationError` objects into structured JSON responses (`{ error: 'Validation Error', details: { ... } }`).
