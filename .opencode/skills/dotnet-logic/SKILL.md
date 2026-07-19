---
name: dotnet-logic
description: Use for ASP.NET Core structure, service boundaries, controller design, validation, async flows, and testable backend code.
---

## dotnet-logic

Apply this skill when working in ASP.NET Core or shared backend code.

### Core rules:

- keep controllers thin and push business rules into services
- inject services through constructors
- use async and await for I/O-bound work
- keep request models, domain logic, and persistence concerns separated

### Preferred patterns:

- validate input at the request boundary
- return clear HTTP responses that match the actual outcome
- keep mapping logic explicit when it improves readability for students
- isolate data access behind services or repositories when the app structure supports it

### Example:

```csharp
public sealed record CreateStudentRequest(string Name, string Email);

public sealed class StudentService : IStudentService
{
	private readonly IStudentRepository _studentRepository;

	public StudentService(IStudentRepository studentRepository)
	{
		_studentRepository = studentRepository;
	}

	public async Task<StudentDto> CreateAsync(CreateStudentRequest request, CancellationToken cancellationToken)
	{
		var student = new Student
		{
			Name = request.Name.Trim(),
			Email = request.Email.Trim()
		};

		await _studentRepository.AddAsync(student, cancellationToken);

		return new StudentDto(student.Id, student.Name, student.Email);
	}
}

[ApiController]
[Route("api/students")]
public sealed class StudentsController : ControllerBase
{
	private readonly IStudentService _studentService;

	public StudentsController(IStudentService studentService)
	{
		_studentService = studentService;
	}

	[HttpPost]
	public async Task<ActionResult<StudentDto>> Create(
		[FromBody] CreateStudentRequest request,
		CancellationToken cancellationToken)
	{
		if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Email))
		{
			return BadRequest("Name and email are required.");
		}

		var student = await _studentService.CreateAsync(request, cancellationToken);

		return CreatedAtAction(nameof(Create), new { id = student.Id }, student);
	}
}
```

Why this fits:

- the controller handles HTTP concerns only
- the service owns the business operation
- async is used on the I/O path
- validation starts at the request boundary

### Avoid:

- putting heavy business logic directly in controllers
- mixing sync and async access patterns in the same flow
- over-abstracting small features with too many interfaces or layers
- hiding simple transformations behind generic helpers

### Definition of done:

- the owning endpoint or service is easy to trace
- the change can be explained step by step
- the narrowest available validation has been run
