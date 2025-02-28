const config = require("../config/auth.config");
const { v4: uuidv4 } = require("uuid");

module.exports = (sequelize, Sequelize) => {
    const RefreshToken = sequelize.define("refreshToken", {
        token: {
            type: Sequelize.STRING,
        },
        expiryDate: {
            type: Sequelize.DATE,
        },
    }, {
        // timestamps: false,
        // paranoid: true,
        // underscored: false,
        // freezeTableName: true,
        tableName: 'zfv71_fftri_refreshToken'
    });

    RefreshToken.createToken = async function (user) {
        let expiredAt = new Date();

        expiredAt.setSeconds(expiredAt.getSeconds() + config.jwtRefreshExpiration);

        let _token = uuidv4();

        let refreshToken = await this.create({
            token: _token,
            userId: user.username,
            expiryDate: expiredAt.getTime(),
        });

        return refreshToken.token;
    };

    RefreshToken.verifyExpiration = (token) => {
        return token.expiryDate.getTime() < new Date().getTime();
    };

    return RefreshToken;
};