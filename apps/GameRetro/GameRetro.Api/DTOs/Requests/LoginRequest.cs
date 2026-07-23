using System.ComponentModel.DataAnnotations;

namespace GameRetro.Api.DTOs.Requests;

public sealed record LoginRequest(
    [Required(ErrorMessage = "email is required")]
    [EmailAddress(ErrorMessage = "a valid email is required")]
    string Email,
    [Required(ErrorMessage = "password is required")]
    string Password);
