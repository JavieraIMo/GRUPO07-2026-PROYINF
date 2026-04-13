// =====================================================
// CONTROLADOR: authController.js
// Maneja la lógica de negocio de autenticación
// =====================================================

const User = require('../models/User');
const { validateRut, validateEmail, validatePassword } = require('../utils/validators');
const { createWelcomeNotification, welcomeNotificationExists } = require('../utils/notificationUtils');

class AuthController {
    
    // ==========================================
    // REGISTRO DE USUARIO
    // ==========================================
    static async register(req, res) {
        try {
            const { rut, nombre_completo, email, telefono, password, confirm_password } = req.body;

            // 1. VALIDACIONES DE ENTRADA
            if (!rut || !nombre_completo || !email || !password || !confirm_password) {
                return res.status(400).json({
                    success: false,
                    error: 'Todos los campos obligatorios deben estar completos'
                });
            }

            // 2. VALIDAR FORMATO DE RUT
            if (!validateRut(rut)) {
                return res.status(400).json({
                    success: false,
                    error: 'RUT inválido. Formato: XX.XXX.XXX-X'
                });
            }

            // 3. VALIDAR FORMATO DE EMAIL
            if (!validateEmail(email)) {
                return res.status(400).json({
                    success: false,
                    error: 'Email inválido'
                });
            }

            // 4. VALIDAR CONTRASEÑA
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: passwordValidation.message
                });
            }

            // 5. CONFIRMAR CONTRASEÑAS COINCIDAN
            if (password !== confirm_password) {
                return res.status(400).json({
                    success: false,
                    error: 'Las contraseñas no coinciden'
                });
            }

            // 6. VERIFICAR QUE EMAIL NO EXISTA
            const emailExists = await User.emailExists(email);
            if (emailExists) {
                return res.status(409).json({
                    success: false,
                    error: 'Este email ya está registrado'
                });
            }

            // 7. VERIFICAR QUE RUT NO EXISTA
            const rutExists = await User.rutExists(rut);
            if (rutExists) {
                return res.status(409).json({
                    success: false,
                    error: 'Este RUT ya está registrado'
                });
            }

            // 8. CREAR USUARIO
            const userData = {
                rut,
                nombre_completo,
                email,
                telefono: telefono || null,
                password // Se encripta en el modelo
            };

            const newUser = await User.create(userData);
            console.log('[REGISTER] Usuario creado:', newUser);

            // 8.5. CREAR NOTIFICACIÓN DE BIENVENIDA
            await createWelcomeNotification(newUser.id);

            // 9. GENERAR TOKEN JWT
            const { signToken } = require('../utils/jwt');
            const jwtToken = signToken({ id: newUser.id, email: newUser.email, rol: newUser.rol });
            console.log('[REGISTER] Token generado:', jwtToken);

            // 10. RESPUESTA EXITOSA CON TOKEN
            res.status(201).json({
                success: true,
                message: 'Usuario registrado exitosamente',
                data: {
                    user: newUser.toJSON(),
                    token: jwtToken
                }
            });
            console.log('[REGISTER] Respuesta enviada:', {
                success: true,
                message: 'Usuario registrado exitosamente',
                data: {
                    user: newUser.toJSON(),
                    token: jwtToken
                }
            });

        } catch (error) {
            console.error('Error in register:', error);
            
            // Manejar errores específicos de base de datos
            if (error.code === '23505') { // Unique constraint violation
                return res.status(409).json({
                    success: false,
                    error: 'El RUT o email ya está registrado'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    }

    // ==========================================
    // LOGIN DE USUARIO
    // ==========================================
    static async login(req, res) {
        try {
            const { email, password } = req.body;

            // 1. VALIDACIONES DE ENTRADA
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Email y contraseña son requeridos'
                });
            }

            // 2. BUSCAR USUARIO POR EMAIL
            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Credenciales inválidas'
                });
            }

            // 3. VERIFICAR CONTRASEÑA
            const isPasswordValid = await user.verifyPassword(password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    error: 'Credenciales inválidas'
                });
            }

            // 3.5. CREAR NOTIFICACIÓN DE BIENVENIDA SI NO EXISTE (para usuarios antiguos)
            const hasWelcome = await welcomeNotificationExists(user.id);
            if (!hasWelcome) {
                await createWelcomeNotification(user.id);
            }

            // 4. GENERAR TOKEN JWT
            const { signToken } = require('../utils/jwt');
            const jwtToken = signToken({ id: user.id, email: user.email, rol: user.rol });

            // 5. RESPUESTA EXITOSA CON TOKEN
            res.status(200).json({
                success: true,
                message: 'Login exitoso',
                data: {
                    user: user.toJSON(),
                    token: jwtToken
                }
            });

        } catch (error) {
            console.error('Error in login:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    }

    // ==========================================
    // VERIFICAR DISPONIBILIDAD DE EMAIL
    // ==========================================
    static async checkEmail(req, res) {
        try {
            const { email } = req.params;

            // 1. VALIDAR FORMATO
            if (!validateEmail(email)) {
                return res.status(400).json({
                    success: false,
                    error: 'Formato de email inválido'
                });
            }

            // 2. VERIFICAR DISPONIBILIDAD
            const emailExists = await User.emailExists(email);

            res.status(200).json({
                success: true,
                data: {
                    email,
                    available: !emailExists,
                    exists: emailExists
                }
            });

        } catch (error) {
            console.error('Error in checkEmail:', error);
            res.status(500).json({
                success: false,
                error: 'Error verificando email'
            });
        }
    }

    // ==========================================
    // VERIFICAR DISPONIBILIDAD DE RUT
    // ==========================================
    static async checkRut(req, res) {
        try {
            const { rut } = req.params;

            // 1. VALIDAR FORMATO
            if (!validateRut(rut)) {
                return res.status(400).json({
                    success: false,
                    error: 'Formato de RUT inválido'
                });
            }

            // 2. VERIFICAR DISPONIBILIDAD
            const rutExists = await User.rutExists(rut);

            res.status(200).json({
                success: true,
                data: {
                    rut,
                    available: !rutExists,
                    exists: rutExists
                }
            });

        } catch (error) {
            console.error('Error in checkRut:', error);
            res.status(500).json({
                success: false,
                error: 'Error verificando RUT'
            });
        }
    }

    // ==========================================
    // OBTENER PERFIL DE USUARIO
    // ==========================================
    static async getProfile(req, res) {
        try {
            // req.user vendría del middleware de autenticación
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'No autorizado'
                });
            }

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'Usuario no encontrado'
                });
            }

            res.status(200).json({
                success: true,
                data: {
                    user: user.toJSON()
                }
            });

        } catch (error) {
            console.error('Error in getProfile:', error);
            res.status(500).json({
                success: false,
                error: 'Error obteniendo perfil'
            });
        }
    }
}

module.exports = AuthController;