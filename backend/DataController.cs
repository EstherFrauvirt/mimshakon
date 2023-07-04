using backend.Controllers.Base;
using backend.Core.Config;
using backend.Core.Data;
using backend.Core.Logging;
using backend.Core.Models;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Linq;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DataController : MainControllerBase
    {
        private readonly SqlManager _sqlManager;


        [HttpPost("GetData")]
        public IActionResult GetData(SpRequest SpRequest)
        {
            try
            {

                var res = new ResponseData(SpRequest.DeleteData(configurationManager, authHelper, Logger));
                return Ok(res);
            }
            catch (Exception ex)
            {
                Logger.Error($"GetData: Sp: {SpRequest.StoredProcedure} p:${JsonConvert.SerializeObject(SpRequest.Params)} v:${JsonConvert.SerializeObject(SpRequest.CmdParmas)} = {ex.Message}", ex);

                return ResponseError(ex);
            }

        }

        [HttpPost("{sendUser}/{db}/{procedure}")]

        public IActionResult Post(bool sendUser, string db, string procedure, [FromBody] JToken data = null)

        {

            SqlParameter[] parameters = new SqlParameter[] { };

            if (data != null && data.HasValues)

                parameters = _sqlManager.ToSqlParameters(data);

            else if (HttpContext.Request.Query != null)

                parameters = _sqlManager.ToSqlParameters(HttpContext.Request.Query);

            var result = _sqlManager.GetSqlData(db, procedure, parameters, sendUser);

            return Ok(result);
        }


        [HttpPost]
        public IActionResult addData(SpRequest SpRequest)
        {
            try
            {

                var res = new ResponseData(SpRequest.DeleteData(configurationManager, authHelper, Logger));
                return Ok(res);
            }
            catch (Exception ex)
            {
                Logger.Error($"GetData: Sp: {SpRequest.StoredProcedure} p:${JsonConvert.SerializeObject(SpRequest.Params)} v:${JsonConvert.SerializeObject(SpRequest.CmdParmas)} = {ex.Message}", ex);

                return ResponseError(ex);
            }

        }

        [HttpPost("DELETE_SERVICE")]
        public IActionResult DELETE_SERVICE(SpRequest SpRequest)
        {
            try
            {

                var res = new ResponseData(SpRequest.DeleteData(configurationManager, authHelper, Logger));
                return Ok(res);
            }
            catch (Exception ex)
            {
                Logger.Error($"DELETE_SERVICE: Sp: {SpRequest.StoredProcedure} p:${JsonConvert.SerializeObject(SpRequest.Params)} v:${JsonConvert.SerializeObject(SpRequest.CmdParmas)} = {ex.Message}", ex);

                return ResponseError(ex);
            }

        }

        [HttpPost("REVERCE_IS_ACTIVE")]
        public IActionResult REVERCE_IS_ACTIVE(SpRequest SpRequest)
        {
            try
            {

                var res = new ResponseData(SpRequest.DeleteData(configurationManager, authHelper, Logger));
                return Ok(res);
            }
            catch (Exception ex)
            {
                Logger.Error($"REVERCE_IS_ACTIVE: Sp: {SpRequest.StoredProcedure} p:${JsonConvert.SerializeObject(SpRequest.Params)} v:${JsonConvert.SerializeObject(SpRequest.CmdParmas)} = {ex.Message}", ex);

                return ResponseError(ex);
            }

        }

    



        [HttpPost("BySchema/{sendUser}/{db}/{procedure}")]

        public IActionResult BySchema(bool sendUser, string db, string procedure, [FromBody] JToken data = null)

        {

            var tableSchema = data["tableSchema"].ToObject<List<TableSchema>>();

            var bodyParameters = data.Value<JObject>("bodyParameters");

            SqlParameter[] parameters = new SqlParameter[] { };

            if (bodyParameters != null && bodyParameters.HasValues)

                parameters = _sqlManager.ToSqlParameters(bodyParameters);

            else if (HttpContext.Request.Query != null)

                parameters = _sqlManager.ToSqlParameters(HttpContext.Request.Query);

            var result = _sqlManager.GetSqlData(db, procedure, tableSchema, parameters, sendUser);

            return Ok(result);


        }


        [HttpPost("ExportToExcel")]
        public IActionResult ExportToExcel(SpRequest SpRequest)
        {
            try
            {
                var res = new ResponseData(SpRequest.DeleteData(configurationManager, authHelper, Logger));
                return this.ExportExcelBL(res.Data[0], SpRequest.columns);
            }
            catch (Exception ex)
            {
                Logger.Error($"ExportToExcel: Sp: {SpRequest.StoredProcedure} = {ex.Message}", ex);
                return ResponseError(ex);
            }

        }
        private string[] offlinePaths = new string[] {
            Path.Combine(Path.GetFullPath(Path.Combine(Environment.CurrentDirectory, @"..\..\..\Client\mobile\public\mockup"))),
            Path.Combine(Path.GetFullPath(Path.Combine(Environment.CurrentDirectory, @"..\..\..\Client\desktop\src\assets\mockups")))
        };

        public DataController(ConfigurationManager cm, IUserAD h, Logger log, SqlManager sqlManager) : base(cm, h, log)
        {
            _sqlManager = sqlManager;
        }
    }

    public class SpRequest : backend.Core.Data.SpRequest
    {
        public List<string> columns { get; set; }
        public IEnumerable<string> CmdParmas { get; private set; }

        public DataSet DeleteData(ConfigurationManager cm, IUserAD h, Logger log)
        {
            var sqlHelper = SqlHelper.GetInstance(h, log);

            DataSet ds;
            var sp = $"{Scheme}.sp_{this.StoredProcedure}";
            using (var db = sqlHelper.CreateConnection(cm.DefaultConnectionString))
            {
                if (Params != null && Params.Length > 0)
                {
                    var p = this.GetSqlParameter(h);
                    CmdParmas = p.Select(e => $"@{e.ParameterName}={e.Value}");
                    ds = sqlHelper.ExecuteDataset(db.Connection, CommandType.StoredProcedure, sp, p);
                }
                else
                    ds = sqlHelper.ExecuteDataset(db.Connection, CommandType.StoredProcedure, sp);
                if (ds.Tables.Count > 0)
                {
                    return ds;
                }
                else return null;
            }
        }

        public override SqlParameter[] GetSqlParameter(IUserAD h)
        {
            SqlParameter[] parm = new SqlParameter[this.Params.Length];
            for (int i = 0, j = 0; i < this.Params.Length && j < this.Params.Length; i++, j++)
            {
                if (this.Params[i].IsTableValue && this.Params[i].Value.GetType() == typeof(string))
                {
                    DataTable dt = JsonConvert.DeserializeObject<DataTable>(this.Params[i].Value.ToString());
                    parm[j] = new SqlParameter(this.Params[i].ParameterName, dt.Rows.Count > 0 ? dt : null);
                    if (dt.Rows.Count <= 0)
                    {
                        var r = parm.ToList();
                        r.RemoveAt(j);
                        parm = r.ToArray();
                        j--;
                    }
                }
                else
                {
                    var value = this.Params[i].Value;
                    var Uppername = this.Params[i].ParameterName.ToUpper();
                    switch (Uppername)
                    {
                        case "USERNAME":
                            value = h.UserName;
                            break;
                        default:
                            break;
                    }
                    parm[i] = new SqlParameter(this.Params[i].ParameterName, value);
                }
            }

            return parm;
        }
    }

}
