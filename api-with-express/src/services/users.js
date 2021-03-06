const debug = require("debug")("services");
const ibmi = require("./ibmi");
const jwt = require("jsonwebtoken");
const config = require("config");
const secret = config.get("secret");
const options = config.get("jwt_option");
const { Connection, Statement } = require("idb-pconnector");
const schema = config.get("schema");

module.exports = ({ MissingResourceError, ValidationError, AuthError }) => {
  return { login };

  async function login(data) {
    let JWTToken;
    try {
      debug("User login : %O", data);

      result = await ibmi.QSYSGETPH(data.profile, data.password);
      debug("Login result %O", result);
      if (result) {
        debug("Login Success");
        // Create JWT
        const payload = { user: data.profile };
        JWTToken = jwt.sign(payload, secret, options);

        if (!JWTToken) {
          throw new AuthError("Username or password is incorrect");
        }
        // Use global variable for RCAC
        const connection = new Connection({ url: "*LOCAL" });
        const statement = new Statement(connection);
        let sql = `set ${schema}.CUSTOMER_LOGIN_ID = '${data.profile}'`;
        await statement.prepare(sql);
        await statement.execute();
        await statement.close();
        await connection.disconn();

        debug("JWTToken : %O", JWTToken);
        return { auth: true, token: JWTToken };
      } else {
        debug("Login failed");
      }
    } catch (errorMessage) {
      debug("Auth failed %O ", errorMessage);
      throw new AuthError("Username or password is incorrect");
    }
  }

  async function logout() {
    // Use global variable for RCAC
    const connection = new Connection({ url: "*LOCAL" });
    const statement = new Statement(connection);
    let sql = `set ${schema}.CUSTOMER_LOGIN_ID = ''`;
    await statement.prepare(sql);
    await statement.execute();
    await statement.close();
    await connection.disconn();

    return { auth: false };
  }
};
