import React, { useState } from 'react';
import './Register.css';

function Register({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    rut: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Formatear RUT automáticamente
    if (name === 'rut') {
      const formattedRut = formatRut(value);
      setFormData(prev => ({
        ...prev,
        [name]: formattedRut
      }));
    } else if (name === 'phone') {
      // Formatear teléfono (solo números)
      const formattedPhone = value.replace(/[^0-9]/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: formattedPhone
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Limpiar error cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Formatear RUT chileno
  const formatRut = (rut) => {
    // Remover caracteres no numéricos excepto K
    const cleanRut = rut.replace(/[^0-9kK]/g, '');
    
    if (cleanRut.length <= 1) return cleanRut;
    
    // Separar número y dígito verificador
    const number = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1).toUpperCase();
    
    // Formatear con puntos
    const formattedNumber = number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    return `${formattedNumber}-${dv}`;
  };

  // Validar RUT chileno
  const validateRut = (rut) => {
    const cleanRut = rut.replace(/[.-]/g, '');
    
    if (cleanRut.length < 8 || cleanRut.length > 9) return false;
    
    const number = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1).toUpperCase();
    
    // Algoritmo de validación RUT
    let sum = 0;
    let multiplier = 2;
    
    for (let i = number.length - 1; i >= 0; i--) {
      sum += parseInt(number[i]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    
    const remainder = sum % 11;
    const calculatedDv = remainder < 2 ? remainder.toString() : (11 - remainder === 10 ? 'K' : (11 - remainder).toString());
    
    return dv === calculatedDv;
  };

  // Validar contraseña
  const validatePassword = (password) => {
    const hasMinLength = password.length >= 6;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    return {
      isValid: hasMinLength && hasUpperCase && hasLowerCase && hasNumber,
      errors: {
        minLength: !hasMinLength,
        upperCase: !hasUpperCase,
        lowerCase: !hasLowerCase,
        number: !hasNumber
      }
    };
  };

  const validateForm = () => {
    const newErrors = {};

    // Validar nombres
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'El nombre es requerido';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'El apellido es requerido';
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    // Validar teléfono
    const phoneRegex = /^[+]?[0-9\s-()]+$/;
    if (!formData.phone) {
      newErrors.phone = 'El teléfono es requerido';
    } else if (!phoneRegex.test(formData.phone) || formData.phone.replace(/[^0-9]/g, '').length < 8) {
      newErrors.phone = 'Teléfono inválido (mínimo 8 dígitos)';
    }

    // Validar RUT
    if (!formData.rut) {
      newErrors.rut = 'El RUT es requerido';
    } else if (!validateRut(formData.rut)) {
      newErrors.rut = 'RUT inválido';
    }

    // Validar contraseña
    const passwordValidation = validatePassword(formData.password);
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (!passwordValidation.isValid) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres, una mayúscula, una minúscula y un número';
    }

    // Validar confirmación de contraseña
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    return newErrors;
  };

  // Verificar si el email ya existe (preparado para API futura)
  const checkEmailExists = async (email) => {
    try {
      const response = await fetch(`http://localhost:3100/api/check-email/${email}`);
      const data = await response.json();
      return Boolean(data?.data?.exists);
    } catch (error) {
      console.error('Error verificando email:', error);
      // Fallback a verificación local si falla la API
      const existingEmails = ['test@test.com', 'admin@alara.cl', 'demo@demo.cl'];
      return existingEmails.includes(email.toLowerCase());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    console.log('[ALARA][Register] Enviando datos a API:', formData);
    try {
      // Verificar email único
      const emailExists = await checkEmailExists(formData.email);
      if (emailExists) {
        setErrors({ email: 'Este email ya está registrado' });
        setIsLoading(false);
        return;
      }

      // Preparar datos para envío (formato MVC)
      const registrationData = {
        nombre_completo: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        email: formData.email.toLowerCase().trim(),
        telefono: formData.phone.replace(/[^0-9]/g, '') || null,
        rut: formData.rut,
        password: formData.password,
        confirm_password: formData.confirmPassword
      };

      console.log('[ALARA][Register] Datos preparados para API:', {
        ...registrationData,
        password: '[SERÁ_ENCRIPTADO_EN_BACKEND]'
      });

      // Llamada real a la API
      console.log('[ALARA][Register] Llamando a /api/auth/register...');
      const response = await fetch('http://localhost:3100/api/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(registrationData)
      });

      const result = await response.json();
      console.log('[ALARA][Register] Respuesta fetch:', result);

      if (!response.ok) {
        const apiError = result.error || result.message || 'Error al procesar el registro';

        if (response.status === 409) {
          if (apiError.toLowerCase().includes('email')) {
            setErrors({ email: 'Este email ya está registrado' });
            setIsLoading(false);
            return;
          }

          if (apiError.toLowerCase().includes('rut')) {
            setErrors({ rut: 'Este RUT ya está registrado' });
            setIsLoading(false);
            return;
          }
        }

        if (response.status === 400) {
          setErrors({ general: apiError });
          setIsLoading(false);
          return;
        }

        throw new Error(apiError);
      }

      // Registro exitoso
      alert('¡Registro exitoso! Bienvenido a ALARA Simulador');

      // Llamar callback de éxito
      if (onSuccess && result.data) {
        // Log para ver la estructura
        console.log('[ALARA][Register] Antes de llamar a onSuccess:', {
          ...result.data.user,
          token: result.data.token
        });
        onSuccess({
          ...result.data.user,
          nombre: result.data.user.nombre || result.data.user.nombre_completo || '',
          token: result.data.token
        });
        console.log('[ALARA][Register] Después de llamar a onSuccess');
      }

      // Cerrar modal
      if (onClose) {
        onClose();
      }

    } catch (error) {
      console.error('[ALARA][Register] Error en registro:', error);
      setErrors({ 
        general: 'Error al procesar el registro. Intenta nuevamente.' 
      });
    } finally {
      setIsLoading(false);
      console.log('[ALARA][Register] handleSubmit finalizado');
    }
  };

  const passwordValidation = validatePassword(formData.password);

  return (
    <div className="register-overlay" onClick={onClose}>
      <div className="register-modal" onClick={e => e.stopPropagation()}>
        <div className="register-header">
          <h2 className="register-title">Crear Cuenta</h2>
          <button className="close-btn" onClick={onClose}>
            <span className="close-icon">×</span>
          </button>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          {errors.general && (
            <div className="error-banner">
              {errors.general}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName" className="form-label">
                Nombre *
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={`form-input ${errors.firstName ? 'error' : ''}`}
                placeholder="Tu nombre"
              />
              {errors.firstName && <span className="error-message">{errors.firstName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="lastName" className="form-label">
                Apellido *
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={`form-input ${errors.lastName ? 'error' : ''}`}
                placeholder="Tu apellido"
              />
              {errors.lastName && <span className="error-message">{errors.lastName}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Correo Electrónico *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="ejemplo@correo.com"
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone" className="form-label">
                Teléfono *
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={`form-input ${errors.phone ? 'error' : ''}`}
                placeholder="+56 9 1234 5678"
              />
              {errors.phone && <span className="error-message">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="rut" className="form-label">
                RUT *
              </label>
              <input
                type="text"
                id="rut"
                name="rut"
                value={formData.rut}
                onChange={handleInputChange}
                className={`form-input ${errors.rut ? 'error' : ''}`}
                placeholder="12.345.678-9"
                maxLength="12"
              />
              {errors.rut && <span className="error-message">{errors.rut}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Contraseña *
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`form-input ${errors.password ? 'error' : ''}`}
              placeholder="Mínimo 6 caracteres"
            />
            {formData.password && (
              <div className="password-requirements">
                <div className={`requirement ${passwordValidation.errors.minLength ? 'invalid' : 'valid'}`}>
                  ✓ Al menos 6 caracteres
                </div>
                <div className={`requirement ${passwordValidation.errors.upperCase ? 'invalid' : 'valid'}`}>
                  ✓ Una letra mayúscula
                </div>
                <div className={`requirement ${passwordValidation.errors.lowerCase ? 'invalid' : 'valid'}`}>
                  ✓ Una letra minúscula
                </div>
                <div className={`requirement ${passwordValidation.errors.number ? 'invalid' : 'valid'}`}>
                  ✓ Un número
                </div>
              </div>
            )}
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirmar Contraseña *
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
              placeholder="Repite tu contraseña"
            />
            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
          </div>

          <button 
            type="submit" 
            className={`register-btn ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Registrando...
              </>
            ) : (
              'Crear Cuenta'
            )}
          </button>
        </form>

        <div className="register-footer">
          <p className="terms-text">
            Al registrarte, aceptas nuestros{' '}
            <a href="#terms" className="link">términos y condiciones</a> y{' '}
            <a href="#privacy" className="link">política de privacidad</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;